import { Redis } from 'ioredis'
import { NextResponse } from 'next/server'

// Define the storage interface
interface Storage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<"OK" | null>
}

// Initialize Redis client with fallback to local storage in development
let storage: Storage

if (process.env.REDIS_URL) {
  const redis = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: false
  })

  // Add connection error handling
  redis.on('error', (error) => {
    console.error('Redis connection error:', error)
  })

  storage = redis
} else {
  // Local storage implementation for development
  const localStore: Record<string, string> = {}
  storage = {
    get: async (key: string) => localStore[key] || null,
    set: async (key: string, value: string) => {
      localStore[key] = value
      return "OK"
    }
  }
  console.log('Using local storage for development')
}

export async function GET() {
  try {
    const campaigns = await storage.get('campaigns')
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
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // Fetch existing campaigns
    let existingCampaigns = []
    try {
      const campaignsStr = await storage.get('campaigns')
      if (campaignsStr) {
        existingCampaigns = JSON.parse(campaignsStr)
      }
    } catch (error) {
      console.error('Error fetching existing campaigns:', error)
      existingCampaigns = []
    }

    // Update campaigns
    const updatedCampaigns = [...existingCampaigns, campaign]
    
    // Save to storage
    try {
      const result = await storage.set('campaigns', JSON.stringify(updatedCampaigns))
      if (result !== "OK") {
        throw new Error('Failed to save campaign to database')
      }
    } catch (error) {
      console.error('Error saving to storage:', error)
      return NextResponse.json(
        { error: 'Failed to save campaign to database' }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Campaign added successfully',
      campaign
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Failed to process campaign' }, 
      { status: 500 }
    )
  }
}

