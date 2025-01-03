import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'
import type { EmailCampaign } from '@/app/types'

const CAMPAIGNS_KEY = 'email-campaigns'

async function parseJsonSafely(request: Request) {
  try {
    return await request.json()
  } catch (error) {
    console.error('JSON parsing error:', error)
    throw new Error('Invalid JSON in request body')
  }
}

export async function GET() {
  try {
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('Missing KV environment variables')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    console.log('Attempting to fetch campaigns...')
    const campaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY)
    
    // Ensure we always return a valid JSON array, even if campaigns is null/undefined
    return NextResponse.json(campaigns ?? [])
  } catch (error) {
    console.error('Detailed error in GET /api/email-campaigns:', error)
    // Ensure error response is always a valid JSON object
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('Missing KV environment variables')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    const campaign = await parseJsonSafely(request)
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

export async function PUT(request: Request) {
  try {
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('Missing KV environment variables')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    const updatedCampaign = await parseJsonSafely(request)
    console.log('Updating campaign:', updatedCampaign)
    
    const existingCampaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY) || []
    const updatedCampaigns = existingCampaigns.map(campaign => 
      campaign.id === updatedCampaign.id ? updatedCampaign : campaign
    )
    
    await kv.set(CAMPAIGNS_KEY, updatedCampaigns)
    console.log('Successfully updated campaign')
    
    return NextResponse.json(updatedCampaign, { status: 200 })
  } catch (error) {
    console.error('Detailed error in PUT /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to update campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('Missing KV environment variables')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    const { id } = await parseJsonSafely(request)
    console.log('Deleting campaign with id:', id)
    
    const existingCampaigns = await kv.get<EmailCampaign[]>(CAMPAIGNS_KEY) || []
    const updatedCampaigns = existingCampaigns.filter(campaign => campaign.id !== id)
    
    await kv.set(CAMPAIGNS_KEY, updatedCampaigns)
    console.log('Successfully deleted campaign')
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Detailed error in DELETE /api/email-campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to delete campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  try {
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('Missing KV environment variables')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    // Test KV connection
    await kv.set('test-key', 'test-value')
    const testValue = await kv.get('test-key')
    
    if (testValue !== 'test-value') {
      throw new Error('KV test failed: set and get operations did not match')
    }

    return NextResponse.json({ message: 'KV connection successful' }, { status: 200 })
  } catch (error) {
    console.error('Error testing KV connection:', error)
    return NextResponse.json({ 
      error: 'Failed to connect to KV',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

