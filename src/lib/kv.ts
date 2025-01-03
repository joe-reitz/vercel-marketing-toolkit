import { kv } from '@vercel/kv'

if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error('Missing required KV environment variables: KV_URL and KV_REST_API_TOKEN must be set')
}

export { kv }

