import { Redis } from 'ioredis'
import { NextResponse } from 'next/server'

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL!)

export async function GET() {
  try {
    const campaigns = await redis.get('campaigns')
    return NextResponse.json(campaigns ? JSON.parse(campaigns) : [])
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const campaign = await request.json()
    
    // Basic server-side validation
    if (!campaign.name || !campaign.sendDate || !campaign.sendTime || !campaign.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existingCampaigns = await redis.get('campaigns')
    const campaigns = existingCampaigns ? JSON.parse(existingCampaigns) : []
    const updatedCampaigns = [...campaigns, campaign]
    await redis.set('campaigns', JSON.stringify(updatedCampaigns))
    
    return NextResponse.json({ message: 'Campaign added successfully', campaign })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 })
  }
}

