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

  // SFDC Date/Time State
  const [sfdcDate, setSfdcDate] = useState<Date>()
  const [sfdcHour, setSfdcHour] = useState("10")
  const [sfdcMinute, setSfdcMinute] = useState("00")
  const [sfdcAmPm, setSfdcAmPm] = useState("AM")
  const [sfdcOutput, setSfdcOutput] = useState("")
  const [activeTab, setActiveTab] = useState("sfdc")

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

  const handleGenerateSfdc = () => {
    if (!sfdcDate) {
      setSfdcOutput("Please select a date")
      return
    }

    // Convert 12-hour to 24-hour format
    let hour24 = Number.parseInt(sfdcHour)
    if (sfdcAmPm === "PM" && hour24 < 12) {
      hour24 += 12
    } else if (sfdcAmPm === "AM" && hour24 === 12) {
      hour24 = 0
    }

    // Format: YYYY-MM-DDTHH:MM:SSZ
    const year = sfdcDate.getFullYear()
    const month = String(sfdcDate.getMonth() + 1).padStart(2, "0")
    const day = String(sfdcDate.getDate()).padStart(2, "0")
    const hourStr = String(hour24).padStart(2, "0")
    const minuteStr = sfdcMinute.padStart(2, "0")
    
    const formatted = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00Z`
    setSfdcOutput(formatted)
  }

  // --- RENDER ---
  return (
    <div className="bg-black text-white p-4 sm:p-8 flex justify-center pt-16">
      <Card className="w-full max-w-3xl bg-black border-gray-800">
        <CardHeader className="p-6 border-b border-gray-800">
          <CardTitle className="text-white text-2xl font-semibold">Date & Time Generator</CardTitle>
          <CardDescription className="text-gray-400">
            Generate SFDC date/time formats or calendar event links.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-900">
              <TabsTrigger 
                value="sfdc"
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                SFDC Date/Time
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                Calendar Event
              </TabsTrigger>
            </TabsList>

            {/* SFDC Date/Time Tab */}
            <TabsContent value="sfdc" className="mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sfdc-date" className="text-gray-300 text-sm font-medium">
                    Date
                  </Label>
                  <Input
                    id="sfdc-date"
                    type="date"
                    value={sfdcDate ? sfdcDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => setSfdcDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="bg-gray-900 border-gray-700 text-white [color-scheme:dark] mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="sfdc-hour" className="text-gray-300 text-sm font-medium">
                      Hour
                    </Label>
                    <Select value={sfdcHour} onValueChange={setSfdcHour}>
                      <SelectTrigger id="sfdc-hour" className="bg-gray-900 border-gray-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        {hours.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sfdc-minute" className="text-gray-300 text-sm font-medium">
                      Minute
                    </Label>
                    <Select value={sfdcMinute} onValueChange={setSfdcMinute}>
                      <SelectTrigger id="sfdc-minute" className="bg-gray-900 border-gray-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        {minutes.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sfdc-ampm" className="text-gray-300 text-sm font-medium">
                      AM/PM
                    </Label>
                    <Select value={sfdcAmPm} onValueChange={setSfdcAmPm}>
                      <SelectTrigger id="sfdc-ampm" className="bg-gray-900 border-gray-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateSfdc}
                  className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white h-12 text-base font-medium mt-6"
                >
                  Generate SFDC Format
                </Button>

                {sfdcOutput && (
                  <div className="mt-6">
                    <Label className="text-gray-300 text-sm font-medium">SFDC Date/Time Format</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        readOnly
                        value={sfdcOutput}
                        className="bg-gray-900 border-gray-700 text-white font-mono text-lg"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleCopy(sfdcOutput, "sfdc")}
                        className="hover:bg-gray-800 border-gray-700"
                      >
                        {copied === "sfdc" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clipboard className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">Format: YYYY-MM-DDTHH:MM:SSZ</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Calendar Event Tab */}
            <TabsContent value="calendar" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Column 1: Event Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="event-name" className="text-gray-300 text-sm font-medium">
                      Event Name
                    </Label>
                    <Input
                      id="event-name"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
                      placeholder="e.g., VIP Dinner with Vercel Team at The Dark Mode"
                    />
                    {errors.eventName && <p className="text-red-500 text-sm mt-1">{errors.eventName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-300 text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
                      placeholder="e.g., The body of the invite (venue info, links, etc.)."
                      rows={5}
                    />
                  </div>
                </div>

                {/* Column 2: Time & Date Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date" className="text-gray-300 text-sm font-medium">
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date ? date.toISOString().split("T")[0] : ""}
                      onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 [color-scheme:dark] mt-1"
                      placeholder="mm/dd/yyyy"
                    />
                    {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="hour" className="text-gray-300 text-sm font-medium">
                        Hour
                      </Label>
                      <Select value={hour} onValueChange={setHour}>
                        <SelectTrigger id="hour" className="bg-gray-900 border-gray-700 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          {hours.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="minute" className="text-gray-300 text-sm font-medium">
                        Minute
                      </Label>
                      <Select value={minute} onValueChange={setMinute}>
                        <SelectTrigger id="minute" className="bg-gray-900 border-gray-700 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          {minutes.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="ampm" className="text-gray-300 text-sm font-medium">
                        AM/PM
                      </Label>
                      <Select value={ampm} onValueChange={setAmPm}>
                        <SelectTrigger id="ampm" className="bg-gray-900 border-gray-700 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="timezone" className="text-gray-300 text-sm font-medium">
                        Timezone
                      </Label>
                      <Popover open={timezonePopoverOpen} onOpenChange={setTimezonePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={timezonePopoverOpen}
                            className="w-full justify-between bg-gray-900 border-gray-700 text-white hover:bg-gray-800 mt-1"
                          >
                            <span className="truncate">
                              {timezone
                                ? allTimezoneOptions.find((tz) => tz.value === timezone)?.label
                                : "Select timezone..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-gray-900 border-gray-700">
                          <Command className="bg-gray-900">
                            <CommandInput
                              placeholder="Search timezone..."
                              className="border-gray-700 text-white"
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
                                    className="aria-selected:bg-gray-800"
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
                                      className="aria-selected:bg-gray-800"
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
                      <Label htmlFor="duration" className="text-gray-300 text-sm font-medium">
                        Duration (minutes)
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
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
                  className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white h-12 text-base font-medium flex items-center justify-center"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Links
                </Button>
              </div>

              {generatedOutput && (
                <div className="mt-8">
                  <Tabs defaultValue="links" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-900">
                      <TabsTrigger
                        value="links"
                        className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
                      >
                        Calendar Links
                      </TabsTrigger>
                      <TabsTrigger
                        value="datetime"
                        className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
                      >
                        Date & Time
                      </TabsTrigger>
                      <TabsTrigger value="iso" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
                        ISO Datetime
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="links" className="mt-4 p-4 bg-gray-900/50 rounded-md border border-gray-800">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-300 text-sm font-medium">Google Calendar</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              readOnly
                              value={generatedOutput.googleLink}
                              className="bg-gray-900 border-gray-700 text-white truncate"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleCopy(generatedOutput.googleLink, "google")}
                              className="hover:bg-gray-800 border-gray-700"
                            >
                              {copied === "google" ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clipboard className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-300 text-sm font-medium">Agical (.ics file)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              readOnly
                              value={generatedOutput.agicalLink}
                              className="bg-gray-900 border-gray-700 text-white truncate"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleCopy(generatedOutput.agicalLink, "agical")}
                              className="hover:bg-gray-800 border-gray-700"
                            >
                              {copied === "agical" ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clipboard className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="datetime" className="mt-4 p-4 bg-gray-900/50 rounded-md border border-gray-800">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="custom-format" className="text-gray-300 text-sm font-medium">
                            Custom Format
                          </Label>
                          <Input
                            id="custom-format"
                            value={customFormat}
                            onChange={(e) => setCustomFormat(e.target.value)}
                            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1 font-mono"
                            placeholder="YYYY-MM-DD HH:mm:ss"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300 text-sm font-medium">Formatted Date & Time</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              readOnly
                              value={generatedOutput.formattedDateTime}
                              className="bg-gray-900 border-gray-700 text-white truncate font-mono"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleCopy(generatedOutput.formattedDateTime, "datetime")}
                              className="hover:bg-gray-800 border-gray-700"
                            >
                              {copied === "datetime" ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clipboard className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="iso" className="mt-4 p-4 bg-gray-900/50 rounded-md border border-gray-800">
                      <div className="space-y-4 font-mono text-sm text-gray-300">
                        <div>
                          <p className="font-semibold text-white">Start UTC:</p>
                          <p className="bg-gray-900 border border-gray-700 p-2 rounded mt-1">{generatedOutput.isoStart}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-white">End UTC:</p>
                          <p className="bg-gray-900 border border-gray-700 p-2 rounded mt-1">{generatedOutput.isoEnd}</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
