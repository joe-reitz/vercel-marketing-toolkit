"use client"

import React, { useState, useEffect, useCallback } from "react"
import { format, parseISO, addMinutes } from "date-fns"
import { CalendarIcon, Clock, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const timezones = [
  { name: "Eastern Time", value: "America/New_York" },
  { name: "Central Time", value: "America/Chicago" },
  { name: "Mountain Time", value: "America/Denver" },
  { name: "Pacific Time", value: "America/Los_Angeles" },
  { name: "Alaska Time", value: "America/Anchorage" },
  { name: "Hawaii-Aleutian Time", value: "America/Adak" },
  { name: "Hawaii Time", value: "Pacific/Honolulu" },
  { name: "Arizona Time", value: "America/Phoenix" },
  { name: "Vancouver", value: "America/Vancouver" },
  { name: "Toronto", value: "America/Toronto" },
  { name: "São Paulo", value: "America/Sao_Paulo" },
  { name: "Mexico City", value: "America/Mexico_City" },
  { name: "Buenos Aires", value: "America/Buenos_Aires" },
  { name: "Lima", value: "America/Lima" },
  { name: "UTC", value: "UTC" },
  { name: "London", value: "Europe/London" },
  { name: "Berlin", value: "Europe/Berlin" },
  { name: "Paris", value: "Europe/Paris" },
  { name: "Rome", value: "Europe/Rome" },
  { name: "Madrid", value: "Europe/Madrid" },
  { name: "Moscow", value: "Europe/Moscow" },
  { name: "Cairo", value: "Africa/Cairo" },
  { name: "Johannesburg", value: "Africa/Johannesburg" },
  { name: "Dubai", value: "Asia/Dubai" },
  { name: "Jerusalem", value: "Asia/Jerusalem" },
  { name: "Tokyo", value: "Asia/Tokyo" },
  { name: "Shanghai", value: "Asia/Shanghai" },
  { name: "Seoul", value: "Asia/Seoul" },
  { name: "Singapore", value: "Asia/Singapore" },
  { name: "Kolkata", value: "Asia/Kolkata" },
  { name: "Bangkok", value: "Asia/Bangkok" },
  { name: "Sydney", value: "Australia/Sydney" },
  { name: "Melbourne", value: "Australia/Melbourne" },
  { name: "Perth", value: "Australia/Perth" },
  { name: "Auckland", value: "Pacific/Auckland" },
]

export default function DateTimeTimezonePicker() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("12:00")
  const [timezone, setTimezone] = useState("UTC")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [eventName, setEventName] = useState("New Event")
  const [duration, setDuration] = useState(60)
  const [description, setDescription] = useState("")
  const [googleCopied, setGoogleCopied] = useState(false)
  const [iCalCopied, setICalCopied] = useState(false)
  const [outlookCopied, setOutlookCopied] = useState(false)
  const [zuluTime, setZuluTime] = useState("")

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value)
  }

  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen)
  }

  const updateZuluTime = useCallback(() => {
    if (!date) return ""
    const [hours, minutes] = time.split(':').map(Number)
    const dateWithTime = new Date(date)
    dateWithTime.setHours(hours, minutes, 0, 0)
    
    // Convert to UTC
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const parts = formatter.formatToParts(dateWithTime)
    const dateParts: {[key: string]: string} = {}
    parts.forEach(part => {
      dateParts[part.type] = part.value
    })
    
    // Construct UTC date
    const utcDate = new Date(
      `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}.000Z`
    )
    
    // Format the UTC date as Zulu time
    return utcDate.toISOString()
  }, [date, time, timezone])

  useEffect(() => {
    setZuluTime(updateZuluTime())
  }, [date, time, timezone, updateZuluTime])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(zuluTime)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateCalendarLink = useCallback((type: 'google' | 'ical' | 'outlook') => {
    if (!date) return ""
    const endDate = addMinutes(parseISO(zuluTime), duration)
    const encodedDescription = encodeURIComponent(description)
    const startDate = zuluTime.replace(/[-:]/g, "").slice(0, -5) + "Z"
    const endDateFormatted = format(endDate, "yyyyMMdd'T'HHmmss'Z'")

    switch (type) {
      case 'google':
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventName)}&dates=${startDate}/${endDateFormatted}&details=${encodedDescription}&ctz=${timezone}`
      case 'ical':
        return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDateFormatted}
SUMMARY:${eventName}
DESCRIPTION:${description.replace(/\n/g, "\\n")}
END:VEVENT
END:VCALENDAR`
      case 'outlook':
        return `https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=${zuluTime}&enddt=${format(endDate, "yyyy-MM-dd'T'HH:mm:ss'Z'")}&subject=${encodeURIComponent(eventName)}&body=${encodedDescription}`
    }
  }, [date, zuluTime, duration, description, eventName, timezone])

  const handleCopy = (type: 'google' | 'ical' | 'outlook') => {
    const link = generateCalendarLink(type)
    navigator.clipboard.writeText(link)
    switch (type) {
      case 'google':
        setGoogleCopied(true)
        setTimeout(() => setGoogleCopied(false), 2000)
        break
      case 'ical':
        setICalCopied(true)
        setTimeout(() => setICalCopied(false), 2000)
        break
      case 'outlook':
        setOutlookCopied(true)
        setTimeout(() => setOutlookCopied(false), 2000)
        break
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-md mx-auto">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <div className="relative">
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            onClick={toggleCalendar}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
          {isCalendarOpen && (
            <div className="absolute z-10 mt-1 bg-background border rounded-md shadow-lg">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate || undefined)
                  setIsCalendarOpen(false)
                }}
                initialFocus
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="time">Time</Label>
        <div className="relative">
          <Input
            type="time"
            id="time"
            value={time}
            onChange={handleTimeChange}
            className="w-full pl-10"
          />
          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.name} ({tz.value})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          Selected: {date ? format(date, "PPP") : "No date"} at {time} {timezone}
        </p>
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Zulu Time:</p>
          <p className="text-sm text-amber-500">{zuluTime}</p>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold">Add to Calendar</h3>
        <div className="space-y-2">
          <Label htmlFor="eventName">Event Name</Label>
          <Input
            id="eventName"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min="1"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className={`w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center transition-all duration-200 ${
              googleCopied ? 'bg-green-600' : ''
            }`}
            onClick={() => handleCopy('google')}
            disabled={!date}
          >
            {googleCopied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {googleCopied ? 'Copied!' : 'Copy Google Calendar Link'}
          </Button>
          <Button
            variant="outline"
            className={`w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center transition-all duration-200 ${
              iCalCopied ? 'bg-green-600' : ''
            }`}
            onClick={() => handleCopy('ical')}
            disabled={!date}
          >
            {iCalCopied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {iCalCopied ? 'Copied!' : 'Copy iCal Link'}
          </Button>
          <Button
            variant="outline"
            className={`w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center transition-all duration-200 ${
              outlookCopied ? 'bg-green-600' : ''
            }`}
            onClick={() => handleCopy('outlook')}
            disabled={!date}
          >
            {outlookCopied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {outlookCopied ? 'Copied!' : 'Copy Outlook Calendar Link'}
          </Button>
        </div>
      </div>
    </div>
  )
}