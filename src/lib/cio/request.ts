/**
 * Customer.io App API transport: auth, rate limiting, retry.
 *
 * The retry/backoff shape is ported from vercel-moperator
 * (src/lib/customerio/client.ts:121-158), with two additions the catalogue needs:
 *
 *   1. A shared token bucket. A full ingest issues one request per email plus
 *      one per link set — thousands of calls against a documented 10-per-second
 *      ceiling. Retrying after the fact is not enough; we have to not exceed it.
 *   2. `Retry-After` is honoured when Customer.io sends it, instead of guessing.
 *
 * Read-only by design: only GET is exposed, and only the App API. The Track API
 * (which needs the site id/key pair) is deliberately absent — the catalogue never
 * writes to Customer.io, so it should not hold credentials that could.
 */

// =============================================================================
// Config
// =============================================================================

function getConfig() {
  const appApiKey = process.env.CUSTOMERIO_APP_API_KEY
  if (!appApiKey) {
    throw new Error(
      "CUSTOMERIO_APP_API_KEY is required. This is the App API bearer token " +
        "(Workspace Settings → API Credentials → App API Keys) — not the Track " +
        "API site id/key pair.",
    )
  }

  const region = (process.env.CUSTOMERIO_REGION || "us").toLowerCase()
  const baseUrl = region === "eu" ? "https://api-eu.customer.io/v1" : "https://api.customer.io/v1"

  return { appApiKey, baseUrl }
}

// =============================================================================
// Rate limiter — token bucket
// =============================================================================

/** Customer.io documents 10 req/s. Sit under it so bursts don't clip the ceiling. */
const REQUESTS_PER_SECOND = Number(process.env.CIO_RPS || 8)
const MIN_INTERVAL_MS = 1000 / REQUESTS_PER_SECOND

let nextSlot = 0

/**
 * Resolve when this caller's turn arrives.
 *
 * Reserves a slot synchronously before awaiting, so concurrent callers each take
 * a distinct slot rather than all reading the same timestamp and firing together.
 */
async function acquireSlot(): Promise<void> {
  const now = Date.now()
  const slot = Math.max(now, nextSlot)
  nextSlot = slot + MIN_INTERVAL_MS
  const wait = slot - now
  if (wait > 0) await sleep(wait)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// =============================================================================
// Request
// =============================================================================

const MAX_RETRIES = 4
const BASE_DELAY_MS = 1000

export interface CioRequestOptions {
  /** Treat 404 as "nothing here" and return null, rather than throwing. */
  tolerate404?: boolean
}

/**
 * GET a path on the App API, relative to the version root (e.g. "/newsletters").
 *
 * Retries on 429 and 5xx. Returns null only when `tolerate404` is set and the
 * resource is genuinely absent — useful for probing endpoints that exist for
 * some message types but not others.
 */
export async function cioGet<T>(path: string, options: CioRequestOptions = {}): Promise<T | null> {
  const { appApiKey, baseUrl } = getConfig()
  const url = `${baseUrl}${path}`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await acquireSlot()

    let res: Response
    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${appApiKey}`,
          "Content-Type": "application/json",
        },
      })
    } catch (err) {
      // Network-level failure (DNS, socket reset). Worth one more try.
      if (attempt < MAX_RETRIES) {
        await sleep(backoffFor(attempt))
        continue
      }
      throw new Error(`Customer.io App API network error (GET ${path}): ${String(err)}`)
    }

    if (res.status === 404 && options.tolerate404) return null

    const retryable = res.status === 429 || res.status >= 500
    if (retryable && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after"))
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffFor(attempt)
      await sleep(delay)
      continue
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "")
      throw new Error(`Customer.io App API error (${res.status} GET ${path}): ${errorText}`)
    }

    const text = await res.text()
    if (!text) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`Customer.io App API returned non-JSON for GET ${path}: ${text.slice(0, 200)}`)
    }
  }

  throw new Error(`Customer.io App API: max retries exceeded for GET ${path}`)
}

function backoffFor(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500
}
