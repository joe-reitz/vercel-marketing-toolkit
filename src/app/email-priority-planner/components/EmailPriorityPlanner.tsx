'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import EmailCalendarView from './EmailCalendarView'
import type { EmailCampaign } from '@/app/types'

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null)
  const { toast } = useToast()

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('Fetching campaigns...')
      const response = await fetch('/api/email-campaigns')
      
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const text = await response.text()
      console.log('Raw response:', text)
      
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error('Error parsing JSON:', e)
        throw new Error('Invalid JSON response')
      }
      
      console.log('Parsed data:', data)
      
      if (!Array.isArray(data)) {
        throw new Error('Expected an array of campaigns')
      }
      
      setCampaigns(data)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      toast({
        title: "Error",
        description: `Failed to fetch campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const testKVConnection = useCallback(async () => {
    try {
      console.log('Testing KV connection...')
      const response = await fetch('/api/email-campaigns', { method: 'OPTIONS' })
      
      console.log('KV test response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('KV test error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const text = await response.text()
      console.log('KV test raw response:', text)
      
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error('Error parsing KV test JSON:', e)
        throw new Error('Invalid JSON response from KV test')
      }
      
      console.log('KV test parsed data:', data)
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error in KV test')
      }
      
      toast({
        title: "KV Connection Test",
        description: "KV connection successful"
      })
    } catch (error) {
      console.error('Error testing KV connection:', error)
      toast({
        title: "KV Connection Test Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      })
    }
  }, [toast])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

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
    
    if (isSubmitting) return
    
    setIsSubmitting(true)
    setError(null)

    try {
      const campaign = {
        ...newCampaign,
        id: editingCampaign ? editingCampaign.id : Date.now().toString(),
      }

      console.log('Submitting campaign:', campaign)

      const response = await fetch('/api/email-campaigns', {
        method: editingCampaign ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaign),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const savedCampaign = await response.json()
      console.log('Saved campaign:', savedCampaign)

      toast({
        title: "Success",
        description: `Campaign ${editingCampaign ? 'updated' : 'saved'} successfully!`,
      })

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
      setEditingCampaign(null)

      await fetchCampaigns()
    } catch (error) {
      console.error('Error saving campaign:', error)
      setError('Failed to save campaign')
      toast({
        title: "Error",
        description: "Failed to save campaign. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign)
    setNewCampaign(campaign)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/email-campaigns', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Campaign deleted successfully!",
      })

      await fetchCampaigns()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast({
        title: "Error",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      })
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
    <div className='flex flex-col lg:flex-row gap-8'>
      <div className='w-full lg:w-1/2'>
        <form onSubmit={handleSubmit} className='space-y-6 p-8 bg-background dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700'>
          <h2 className='text-2xl font-bold text-primary mb-6'>
            {editingCampaign ? 'Edit Email Campaign' : 'New Email Campaign'}
          </h2>

          <div className='space-y-2'>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              name="name"
              value={newCampaign.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className='space-y-2'>
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
              className='dark:text-gray-300 dark:[color-scheme:dark]'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor="sendTime">Preferred Send Time</Label>
            <Input
              id="sendTime"
              name="sendTime"
              type="time"
              value={newCampaign.sendTime}
              onChange={handleInputChange}
              required
              className='dark:text-gray-300 dark:[color-scheme:dark]'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor="timezone">Timezone</Label>
            <Select name="timezone" onValueChange={(value) => handleSelectChange('timezone', value)} value={newCampaign.timezone}>
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

          <div className='space-y-2'>
            <Label htmlFor="type">Campaign Type</Label>
            <Select name="type" onValueChange={(value) => handleSelectChange('type', value)} value={newCampaign.type}>
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

          <div className='space-y-2'>
            <Label>Is this a transactional email?</Label>
            <RadioGroup onValueChange={handleRadioChange} value={newCampaign.isTransactional.toString()}>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value="false" id="non-transactional" />
                <Label htmlFor="non-transactional">No</Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value="true" id="transactional" />
                <Label htmlFor="transactional">Yes</Label>
              </div>
            </RadioGroup>
          </div>

          <div className='space-y-2'>
            <Label htmlFor="description">Audience Description</Label>
            <Textarea
              id="description"
              name="description"
              value={newCampaign.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className='w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-800 dark:hover:bg-blue-900'
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                {editingCampaign ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              editingCampaign ? 'Update Campaign' : 'Save Campaign'
            )}
          </Button>

          {error && (
            <p className='text-sm text-red-500 mt-2'>{error}</p>
          )}
        </form>
      </div>
      <div className='w-full lg:w-1/2'>
        {isLoading ? (
          <div className='flex items-center justify-center h-32'>
            <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
          </div>
        ) : (
          <>
            <EmailCalendarView campaigns={campaigns} />
            <div className='mt-8'>
              <h3 className='text-xl font-bold mb-4'>All Campaigns</h3>
              <ul className='space-y-4'>
                {campaigns.map((campaign) => (
                  <li key={campaign.id} className='flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow'>
                    <span>{campaign.name}</span>
                    <div>
                      <Button
                        onClick={() => handleEdit(campaign)}
                        variant="ghost"
                        size="sm"
                        className='mr-2'
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        onClick={() => handleDelete(campaign.id)}
                        variant="ghost"
                        size="sm"
                        className='text-red-500 hover:text-red-700'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              onClick={testKVConnection}
              className='mt-4 bg-green-600 hover:bg-green-700 text-white'
            >
              Test KV Connection
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

