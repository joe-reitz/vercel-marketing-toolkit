"use client"

import { useState } from 'react'
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Clock, Copy, Check } from 'lucide-react'
import { format } from "date-fns"

export default function DateTimePicker() {
  const [date, setDate] = useState<Date>(new Date())
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"))
  const [isoTime, setIsoTime] = useState<string>("")
  const [copied, setCopied] = useState(false)

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
    }
  }

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTime(event.target.value)
  }

  const generateISOTime = () => {
    const [hours, minutes] = time.split(':')
    const newDate = new Date(date)
    newDate.setHours(parseInt(hours), parseInt(minutes))
    setIsoTime(newDate.toISOString())
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(isoTime).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-black rounded-lg shadow-xl border border-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-white">Date & Time Picker</h1>
      <div className="space-y-4">
        <div>
          <Label htmlFor="datePicker" className="text-white">Select Date</Label>
          <div className="mt-1">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              className="rounded-md border border-gray-800 bg-black text-white"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="timePicker" className="text-white">Select Time</Label>
          <div className="flex mt-1 items-center">
            <Clock className="mr-2 h-4 w-4 text-white" />
            <Input
              type="time"
              id="timePicker"
              value={time}
              onChange={handleTimeChange}
              className="rounded-md border border-gray-800 bg-black text-white"
            />
          </div>
        </div>
        <Button 
          onClick={generateISOTime} 
          className="w-full bg-blue-600 text-white hover:bg-blue-800 transition-colors"
        >
          Generate ISO Time
        </Button>
        {isoTime && (
          <div className="mt-4">
            <Label htmlFor="isoOutput" className="text-white">ISO Formatted Time</Label>
            <div className="flex mt-1">
              <Input
                id="isoOutput"
                value={isoTime}
                readOnly
                className="rounded-l-md border-r-0 border-gray-800 bg-black text-white flex-grow"
              />
              <Button
                onClick={copyToClipboard}
                className="rounded-l-none bg-green-600 hover:bg-green-800 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4 text-white" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}