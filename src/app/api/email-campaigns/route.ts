import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'
import type { EmailCampaign } from '@/app/types'

const CAMPAIGNS_KEY = 'email-campaigns'

export async function GET() {
  try {
    // Add connection validation
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('Missing KV environment variables')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    console.log('Attempting to fetch campaigns...')
    const campaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY)
    console.log('Fetched campaigns:', campaigns)
    return NextResponse.json(campaigns || [])
  } catch (error) {
    console.error('Detailed error in GET /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Add connection validation
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('Missing KV environment variables')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    const campaign = await request.json()
    console.log('Received campaign:', campaign)
    
    const existingCampaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY) || []
    const updatedCampaigns = [...existingCampaigns, campaign]
    
    await kv.set(CAMPAIGNS_KEY, updatedCampaigns)
    console.log('Successfully saved campaign')
    
    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('Detailed error in POST /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to save campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

