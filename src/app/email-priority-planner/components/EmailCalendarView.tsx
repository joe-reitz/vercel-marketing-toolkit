import * as React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { EmailCampaign } from '@/app/types'

interface EmailCalendarViewProps {
  campaigns: EmailCampaign[]
}

export default function EmailCalendarView({ campaigns }: EmailCalendarViewProps) {
  const today = new Date()
  const endOfNextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14)

  const filteredCampaigns = campaigns.filter(campaign => {
    const campaignDate = new Date(campaign.sendDate)
    return campaignDate >= today && campaignDate <= endOfNextWeek
  })

  const sortedCampaigns = filteredCampaigns.sort((a, b) => {
    const dateA = new Date(a.sendDate).getTime()
    const dateB = new Date(b.sendDate).getTime()
    if (dateA === dateB) {
      return b.priorityScore - a.priorityScore
    }
    return dateA - dateB
  })

  const getRowColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'bg-blue-100 dark:bg-blue-950/50'
      case 'promotional':
        return 'bg-yellow-100 dark:bg-yellow-950/50'
      case 'nurture':
        return 'bg-green-100 dark:bg-green-950/50'
      default:
        return 'bg-gray-100 dark:bg-gray-900/50'
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Upcoming Campaigns</h2>
      <div className="overflow-x-auto">
        <Table className="border-collapse border border-gray-200 dark:border-gray-700">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-950">
              <TableHead className="font-semibold text-gray-900 dark:text-gray-300">Campaign Name</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-gray-300">Send Date & Time</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-gray-300">Audience Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCampaigns.map((campaign) => (
              <TableRow key={campaign.id} className={getRowColor(campaign.type)}>
                <TableCell className="font-medium dark:text-gray-300">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{campaign.name}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="p-4 max-w-xs bg-white dark:bg-gray-950 border dark:border-gray-800">
                        <p><strong>Type:</strong> {campaign.type}</p>
                        <p><strong>Timezone:</strong> {campaign.timezone}</p>
                        <p><strong>Priority Score:</strong> {campaign.priorityScore}</p>
                        <p><strong>Transactional:</strong> {campaign.isTransactional ? 'Yes' : 'No'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="dark:text-gray-400">{`${campaign.sendDate} ${campaign.sendTime}`}</TableCell>
                <TableCell className="dark:text-gray-400">{campaign.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

