import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'
import type { EmailCampaign } from '@/app/types'

const CAMPAIGNS_KEY = 'email-campaigns'

export const runtime = 'nodejs'

export async function GET() {
  console.log('GET: Attempting to fetch campaigns...')
  try {
    const campaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY)
    console.log('GET: Raw fetched campaigns:', campaigns)
    
    if (!campaigns || !Array.isArray(campaigns)) {
      console.log('GET: No campaigns found or invalid data, returning empty array')
      return NextResponse.json([])
    }
    
    const sanitizedCampaigns = campaigns.map(campaign => ({
      id: String(campaign.id),
      name: String(campaign.name),
      sendDate: String(campaign.sendDate),
      sendTime: String(campaign.sendTime),
      timezone: String(campaign.timezone),
      type: String(campaign.type),
      isTransactional: Boolean(campaign.isTransactional),
      description: String(campaign.description),
      priorityScore: Number(campaign.priorityScore)
    }))
    
    console.log('GET: Sanitized campaigns:', sanitizedCampaigns)
    return NextResponse.json(sanitizedCampaigns)
  } catch (error) {
    console.error('GET: Error in /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  console.log('POST: Attempting to save campaign...')
  try {
    const campaign = await request.json()
    console.log('POST: Received campaign:', campaign)
    
    const existingCampaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY) || []
    const updatedCampaigns = [...existingCampaigns, campaign]
    
    await kv.set(CAMPAIGNS_KEY, updatedCampaigns)
    console.log('POST: Successfully saved campaign')
    
    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('POST: Error in /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to save campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  console.log('PUT: Attempting to update campaign...')
  try {
    const updatedCampaign = await request.json()
    console.log('PUT: Updating campaign:', updatedCampaign)
    
    const existingCampaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY) || []
    const updatedCampaigns = existingCampaigns.map(campaign => 
      campaign.id === updatedCampaign.id ? updatedCampaign : campaign
    )
    
    await kv.set(CAMPAIGNS_KEY, updatedCampaigns)
    console.log('PUT: Successfully updated campaign')
    
    return NextResponse.json(updatedCampaign, { status: 200 })
  } catch (error) {
    console.error('PUT: Error in /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to update campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  console.log('DELETE: Attempting to delete campaign...')
  try {
    const { id } = await request.json()
    console.log('DELETE: Deleting campaign with id:', id)
    
    const existingCampaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY) || []
    const updatedCampaigns = existingCampaigns.filter(campaign => campaign.id !== id)
    
    await kv.set(CAMPAIGNS_KEY, updatedCampaigns)
    console.log('DELETE: Successfully deleted campaign')
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE: Error in /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to delete campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  console.log('OPTIONS: Testing KV connection...')
  try {
    const testKey = 'test-connection-key'
    const testValue = 'test-connection-value'
    
    console.log('OPTIONS: Setting test key...')
    await kv.set(testKey, testValue)
    console.log('OPTIONS: Test key set successfully')
    
    console.log('OPTIONS: Getting test key...')
    const retrievedValue = await kv.get(testKey)
    console.log('OPTIONS: Retrieved value:', retrievedValue)
    
    console.log('OPTIONS: Deleting test key...')
    await kv.del(testKey)
    console.log('OPTIONS: Test key deleted successfully')
    
    if (retrievedValue !== testValue) {
      throw new Error('KV test failed: set and get operations did not match')
    }

    console.log('OPTIONS: KV connection test successful')
    return NextResponse.json({ 
      success: true,
      message: 'KV connection successful',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('OPTIONS: Error testing KV connection:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to connect to KV',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

