'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import EmailCalendarView from './EmailCalendarView'

export interface EmailCampaign {
  id: string
  name: string
  sendDate: string
  sendTime: string
  timezone: string
  type: string
  isTransactional: boolean
  description: string
  priorityScore: number
}

const campaignTypes = [
  { value: 'event', label: 'Event', priorityScore: 4 },
  { value: 'promotional', label: 'Promotional', priorityScore: 3 },
  { value: 'nurture', label: 'Nurture', priorityScore: 2 },
  { value: 'other', label: 'Other', priorityScore: 1 },
]

const namerTimezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
]

const otherTimezones = [
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

export function EmailPriorityPlanner() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [newCampaign, setNewCampaign] = useState<EmailCampaign>({
    id: '',
    name: '',
    sendDate: '',
    sendTime: '',
    timezone: 'America/New_York',
    type: '',
    isTransactional: false,
    description: '',
    priorityScore: 0,
  })

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/email-campaigns')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setCampaigns(data)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewCampaign(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'type') {
      const selectedType = campaignTypes.find(type => type.value === value)
      setNewCampaign(prev => ({
        ...prev,
        type: value,
        priorityScore: selectedType ? selectedType.priorityScore : 0,
      }))
    } else {
      setNewCampaign(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleRadioChange = (value: string) => {
    setNewCampaign(prev => ({ ...prev, isTransactional: value === 'true' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const campaign = {
      ...newCampaign,
      id: Date.now().toString(),
    }
    try {
      const response = await fetch('/api/email-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaign),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      await fetchCampaigns()
      setNewCampaign({
        id: '',
        name: '',
        sendDate: '',
        sendTime: '',
        timezone: 'America/New_York',
        type: '',
        isTransactional: false,
        description: '',
        priorityScore: 0,
      })
    } catch (error) {
      console.error('Error saving campaign:', error)
    }
  }

  const getMinMaxDates = () => {
    const today = new Date()
    const endOfNextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14)
    return {
      min: today.toISOString().split('T')[0],
      max: endOfNextWeek.toISOString().split('T')[0],
    }
  }

  const { min, max } = getMinMaxDates()

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/2">
        <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-background dark:bg-blackrounded-xl shadow-md border border-white dark:border-gray-700">
          <h2 className="text-2xl font-bold text-primary mb-6">New Email Campaign</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              name="name"
              value={newCampaign.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sendDate">Preferred Send Date</Label>
            <Input
              id="sendDate"
              name="sendDate"
              type="date"
              min={min}
              max={max}
              value={newCampaign.sendDate}
              onChange={handleInputChange}
              required
              className="dark:text-gray-300 dark:[color-scheme:dark]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sendTime">Preferred Send Time</Label>
            <Input
              id="sendTime"
              name="sendTime"
              type="time"
              value={newCampaign.sendTime}
              onChange={handleInputChange}
              required
              className="dark:text-gray-300 dark:[color-scheme:dark]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select name="timezone" onValueChange={(value) => handleSelectChange('timezone', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="namer-group" disabled>NAMER Timezones</SelectItem>
                {namerTimezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
                <SelectItem value="other-group" disabled>Other Timezones</SelectItem>
                {otherTimezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Campaign Type</Label>
            <Select name="type" onValueChange={(value) => handleSelectChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign type" />
              </SelectTrigger>
              <SelectContent>
                {campaignTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Is this a transactional email?</Label>
            <RadioGroup onValueChange={handleRadioChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="non-transactional" />
                <Label htmlFor="non-transactional">No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="transactional" />
                <Label htmlFor="transactional">Yes</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Campaign Description</Label>
            <Textarea
              id="description"
              name="description"
              value={newCampaign.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-800 dark:hover:bg-blue-900">
            Save Campaign
          </Button>
        </form>
      </div>
      <div className="w-full lg:w-1/2">
        <EmailCalendarView campaigns={campaigns} />
      </div>
    </div>
  )
}

