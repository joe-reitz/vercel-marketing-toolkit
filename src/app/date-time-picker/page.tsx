"use client"

import React, { useState } from "react"
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
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Tokyo",
]

export default function DateTimeTimezonePicker() {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState("12:00")
  const [timezone, setTimezone] = useState("UTC")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [eventName, setEventName] = useState("New Event")
  const [duration, setDuration] = useState(60)
  const [description, setDescription] = useState("")

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value)
  }

  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen)
  }

  const getZuluTime = () => {
    if (!date) return ""
    const [hours, minutes] = time.split(':').map(Number)
    const dateWithTime = addMinutes(addMinutes(date, hours * 60), minutes)
    return format(dateWithTime, "yyyy-MM-dd'T'HH:mm:ss'Z'")
  }

  const zuluTime = getZuluTime()

  const copyToClipboard = () => {
    navigator.clipboard.writeText(zuluTime)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateCalendarLink = (type: 'google' | 'ical' | 'outlook') => {
    if (!date) return ""
    const endDate = addMinutes(parseISO(zuluTime), duration)
    const encodedDescription = encodeURIComponent(description)
    const startDate = zuluTime.replace(/[-:]/g, "")
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
        return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(eventName)}&startdt=${zuluTime}&enddt=${format(endDate, "yyyy-MM-dd'T'HH:mm:ss'Z'")}&body=${encodedDescription}&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent`
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
                  setDate(newDate)
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
              <SelectItem key={tz} value={tz}>
                {tz}
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
            className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
            onClick={() => {
              const link = generateCalendarLink('google')
              navigator.clipboard.writeText(link)
            }}
            disabled={!date}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Google Calendar Link
          </Button>
          <Button
            variant="outline"
            className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
            onClick={() => {
              const link = generateCalendarLink('ical')
              navigator.clipboard.writeText(link)
            }}
            disabled={!date}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy iCal Link
          </Button>
          <Button
            variant="outline"
            className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
            onClick={() => {
              const link = generateCalendarLink('outlook')
              navigator.clipboard.writeText(link)
            }}
            disabled={!date}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Outlook Calendar Link
          </Button>
        </div>
      </div>
    </div>
  )
}