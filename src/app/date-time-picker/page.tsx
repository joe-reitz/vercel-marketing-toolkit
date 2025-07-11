"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, Clipboard, ChevronsUpDown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type ErrorState = {
  [key: string]: string | null
}

// Helper function to format date with custom format string
const formatDate = (date: Date, format: string, timeZone: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }

  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date)
  const partMap = parts.reduce(
    (acc, part) => {
      acc[part.type] = part.value
      return acc
    },
    {} as Record<string, string>,
  )

  return format
    .replace("YYYY", partMap.year)
    .replace("MM", partMap.month)
    .replace("DD", partMap.day)
    .replace("HH", partMap.hour === "24" ? "00" : partMap.hour) // Handle midnight case
    .replace("mm", partMap.minute)
    .replace("ss", partMap.second)
}

// Prioritized US timezones
const usTimezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
]

export default function EventCreatorPage() {
  // --- STATE MANAGEMENT ---
  const [eventName, setEventName] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date>()
  const [hour, setHour] = useState("10")
  const [minute, setMinute] = useState("00")
  const [ampm, setAmPm] = useState("AM")
  const [timezone, setTimezone] = useState("America/New_York")
  const [duration, setDuration] = useState("60")
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false)
  const [customFormat, setCustomFormat] = useState("YYYY-MM-DD HH:mm:ss")

  const [errors, setErrors] = useState<ErrorState>({})
  const [generatedOutput, setGeneratedOutput] = useState<{
    googleLink: string
    agicalLink: string
    isoStart: string
    isoEnd: string
    formattedDateTime: string
  } | null>(null)

  const [copied, setCopied] = useState<string | null>(null)

  // --- DATA & MEMOIZATION ---
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone")
    } catch (_e) {
      // Fix: Changed e to _e to satisfy eslint rule
      // Fallback for older environments
      return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Tokyo"]
    }
  }, [])

  const allTimezoneOptions = useMemo(() => {
    const usValues = new Set(usTimezones.map((tz) => tz.value))
    const otherTimezones = timezones
      .filter((tz) => !usValues.has(tz))
      .map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }))
    return [...usTimezones, ...otherTimezones]
  }, [timezones])

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), [])
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), [])

  const isoStart = generatedOutput?.isoStart
  useEffect(() => {
    if (isoStart) {
      const newFormatted = formatDate(new Date(isoStart), customFormat, timezone)
      setGeneratedOutput((prev) => (prev ? { ...prev, formattedDateTime: newFormatted } : null))
    }
  }, [isoStart, customFormat, timezone]) // Fix: Corrected useEffect dependencies to prevent infinite loops and satisfy linter

  // --- CORE LOGIC ---
  const handleGenerate = () => {
    // 1. Validation
    const newErrors: ErrorState = {}
    if (!eventName) newErrors.eventName = "Event name is required."
    if (!date) newErrors.date = "Date is required."
    if (!timezone) newErrors.timezone = "Timezone is required."
    if (!duration || Number.parseInt(duration) <= 0) newErrors.duration = "Duration must be a positive number."

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      setGeneratedOutput(null)
      return
    }

    // Add an explicit guard to satisfy TypeScript's static analysis
    if (!date) {
      // This case is handled by the validation above, but this check satisfies the compiler.
      return
    }

    // 2. Time Conversion
    let hour24 = Number.parseInt(hour)
    if (ampm === "PM" && hour24 < 12) {
      hour24 += 12
    } else if (ampm === "AM" && hour24 === 12) {
      hour24 = 0 // Midnight case
    }

    const dateString = date.toISOString().split("T")[0]
    const localDateTimeString = `${dateString}T${String(hour24).padStart(2, "0")}:${minute}:00`

    // This is the key part: get the correct offset for the selected date and timezone
    let startUtc: Date
    try {
      const tempDate = new Date(localDateTimeString)
      if (isNaN(tempDate.getTime())) {
        throw new Error("Invalid date created")
      }

      const timeZoneName = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "longOffset",
      }).format(tempDate)

      const offsetMatch = timeZoneName.match(/GMT([+-]\d{1,2}(?::\d{2})?)/)
      if (!offsetMatch) {
        // Fallback for environments that don't support longOffset well, treat as local
        console.warn("Could not determine timezone offset, treating as local time.")
        startUtc = new Date(localDateTimeString)
      } else {
        let offset = offsetMatch[1]
        if (!offset.includes(":")) {
          offset = `${offset}:00`
        }
        const isoStringWithOffset = `${localDateTimeString}${offset}`
        startUtc = new Date(isoStringWithOffset)
      }
    } catch (_e) {
      // Fix: Changed e to _e to satisfy eslint rule
      console.error("Date parsing error:", _e)
      setErrors({ date: "Could not parse the selected date and time. Please check your inputs." })
      return
    }

    if (isNaN(startUtc.getTime())) {
      setErrors({ date: "Could not create a valid UTC date. Please check your inputs." })
      return
    }

    const endUtc = new Date(startUtc.getTime() + Number.parseInt(duration) * 60 * 1000)

    // 3. Format for Links & Date/Time
    const toGoogleCalendarFormat = (d: Date) => d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z"
    const startUtcFormatted = toGoogleCalendarFormat(startUtc)
    const endUtcFormatted = toGoogleCalendarFormat(endUtc)

    const encodedEventName = encodeURIComponent(eventName)
    const encodedDescription = encodeURIComponent(description)

    const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodedEventName}&dates=${startUtcFormatted}/${endUtcFormatted}&details=${encodedDescription}&ctz=${timezone}`
    const agicalLink = `https://ics.agical.io/?startdt=${startUtcFormatted}&enddt=${endUtcFormatted}&subject=${encodedEventName}&description=${encodedDescription}`
    const formattedDateTime = formatDate(startUtc, customFormat, timezone)

    setGeneratedOutput({
      googleLink,
      agicalLink,
      isoStart: startUtc.toISOString(),
      isoEnd: endUtc.toISOString(),
      formattedDateTime,
    })
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // --- RENDER ---
  return (
    <div className="bg-black text-gray-300 min-h-screen p-4 sm:p-8 flex justify-center pt-16">
      <Card className="w-full max-w-3xl bg-slate-900 border-slate-800 text-gray-300">
        <CardHeader className="p-6">
          <CardTitle className="text-white text-2xl font-semibold">Create Calendar Event</CardTitle>
          <CardDescription className="text-slate-400">
            Fill in the details to generate shareable calendar links.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Column 1: Event Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-name" className="text-slate-400 text-sm font-medium">
                  Event Name
                </Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-blue-500 mt-1"
                  placeholder="e.g., VIP Dinner with Vercel Team at The Dark Mode"
                />
                {errors.eventName && <p className="text-red-500 text-sm mt-1">{errors.eventName}</p>}
              </div>
              <div>
                <Label htmlFor="description" className="text-slate-400 text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-blue-500 mt-1"
                  placeholder="e.g., The body of the invite (venue info, links, etc.)."
                  rows={5}
                />
              </div>
            </div>

            {/* Column 2: Time & Date Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="date" className="text-slate-400 text-sm font-medium">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date ? date.toISOString().split("T")[0] : ""}
                  onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-blue-500 mt-1"
                  placeholder="mm/dd/yyyy"
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="hour" className="text-slate-400 text-sm font-medium">
                    Hour
                  </Label>
                  <Select value={hour} onValueChange={setHour}>
                    <SelectTrigger id="hour" className="bg-slate-800 border-slate-700 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {hours.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minute" className="text-slate-400 text-sm font-medium">
                    Minute
                  </Label>
                  <Select value={minute} onValueChange={setMinute}>
                    <SelectTrigger id="minute" className="bg-slate-800 border-slate-700 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {minutes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ampm" className="text-slate-400 text-sm font-medium">
                    AM/PM
                  </Label>
                  <Select value={ampm} onValueChange={setAmPm}>
                    <SelectTrigger id="ampm" className="bg-slate-800 border-slate-700 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="timezone" className="text-slate-400 text-sm font-medium">
                    Timezone
                  </Label>
                  <Popover open={timezonePopoverOpen} onOpenChange={setTimezonePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={timezonePopoverOpen}
                        className="w-full justify-between bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white mt-1"
                      >
                        <span className="truncate">
                          {timezone
                            ? allTimezoneOptions.find((tz) => tz.value === timezone)?.label
                            : "Select timezone..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-800 border-slate-700 text-white">
                      <Command>
                        <CommandInput
                          placeholder="Search timezone..."
                          className="text-white border-slate-700 focus:ring-blue-500"
                        />
                        <CommandList>
                          <CommandEmpty>No timezone found.</CommandEmpty>
                          <CommandGroup heading="Common">
                            {usTimezones.map((tz) => (
                              <CommandItem
                                key={tz.value}
                                value={tz.value}
                                onSelect={(currentValue) => {
                                  setTimezone(currentValue === timezone ? "" : currentValue)
                                  setTimezonePopoverOpen(false)
                                }}
                                className="aria-selected:bg-slate-700"
                              >
                                <Check
                                  className={cn("mr-2 h-4 w-4", timezone === tz.value ? "opacity-100" : "opacity-0")}
                                />
                                {tz.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="All Timezones">
                            {allTimezoneOptions
                              .filter((tz) => !usTimezones.find((usTz) => usTz.value === tz.value))
                              .map((tz) => (
                                <CommandItem
                                  key={tz.value}
                                  value={tz.value}
                                  onSelect={(currentValue) => {
                                    setTimezone(currentValue === timezone ? "" : currentValue)
                                    setTimezonePopoverOpen(false)
                                  }}
                                  className="aria-selected:bg-slate-700"
                                >
                                  <Check
                                    className={cn("mr-2 h-4 w-4", timezone === tz.value ? "opacity-100" : "opacity-0")}
                                  />
                                  {tz.label}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.timezone && <p className="text-red-500 text-sm mt-1">{errors.timezone}</p>}
                </div>
                <div>
                  <Label htmlFor="duration" className="text-slate-400 text-sm font-medium">
                    Duration (minutes)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white focus:ring-blue-500 mt-1"
                    min="1"
                  />
                  {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button
              onClick={handleGenerate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium flex items-center justify-center"
            >
              <Sparkles className="mr-2 h-5 w-5" /> {/* Add icon to button */}
              Generate Links
            </Button>
          </div>

          {generatedOutput && (
            <div className="mt-8">
              <Tabs defaultValue="links" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800 text-slate-400">
                  <TabsTrigger
                    value="links"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                  >
                    Calendar Links
                  </TabsTrigger>
                  <TabsTrigger
                    value="datetime"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                  >
                    Date & Time
                  </TabsTrigger>
                  <TabsTrigger value="iso" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                    ISO Datetime
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="links" className="mt-4 p-4 bg-slate-800/50 rounded-md border border-slate-800">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 text-sm">Google Calendar</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          readOnly
                          value={generatedOutput.googleLink}
                          className="bg-slate-900 border-slate-700 text-slate-400 truncate"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopy(generatedOutput.googleLink, "google")}
                          className="hover:bg-slate-700"
                        >
                          {copied === "google" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clipboard className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-sm">Agical (.ics file)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          readOnly
                          value={generatedOutput.agicalLink}
                          className="bg-slate-900 border-slate-700 text-slate-400 truncate"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopy(generatedOutput.agicalLink, "agical")}
                          className="hover:bg-slate-700"
                        >
                          {copied === "agical" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clipboard className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="datetime" className="mt-4 p-4 bg-slate-800/50 rounded-md border border-slate-800">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="custom-format" className="text-slate-400 text-sm">
                        Custom Format
                      </Label>
                      <Input
                        id="custom-format"
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-slate-300 mt-1 font-mono"
                        placeholder="YYYY-MM-DD HH:mm:ss"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-sm">Formatted Date & Time</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          readOnly
                          value={generatedOutput.formattedDateTime}
                          className="bg-slate-900 border-slate-700 text-slate-400 truncate font-mono"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopy(generatedOutput.formattedDateTime, "datetime")}
                          className="hover:bg-slate-700"
                        >
                          {copied === "datetime" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clipboard className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="iso" className="mt-4 p-4 bg-slate-800/50 rounded-md border border-slate-800">
                  <div className="space-y-4 font-mono text-sm text-slate-400">
                    <div>
                      <p className="font-semibold text-slate-300">Start UTC:</p>
                      <p className="bg-slate-900 p-2 rounded mt-1">{generatedOutput.isoStart}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300">End UTC:</p>
                      <p className="bg-slate-900 p-2 rounded mt-1">{generatedOutput.isoEnd}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
