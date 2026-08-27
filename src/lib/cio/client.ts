/**
 * Customer.io App API client — the four email surfaces plus per-link clicks.
 *
 * Two API dialects live here, and mixing them up produces silently empty
 * metrics rather than an error:
 *
 *   - Campaigns/actions: `version=2` with `start`/`end` (unix seconds), `res`,
 *     `tz`. The `period`/`steps` pair is deprecated v1 on these endpoints.
 *   - Newsletters/broadcasts/transactional: the pre-versioned `period`/`steps`.
 *   - Link metrics: `period`/`steps` everywhere, per the App API reference.
 *
 * The version=2 requirement is documented in vercel-moperator
 * (src/lib/customerio/client.ts:326-334), where omitting it was found to be half
 * the reason campaign metrics came back unreadable.
 */

import { cioGet } from "./request"
import type {
  CioAction,
  CioActionsResponse,
  CioBroadcastsResponse,
  CioCampaignsResponse,
  CioLinkMetric,
  CioLinkMetricsResponse,
  CioNewsletterContentsResponse,
  CioNewslettersResponse,
  CioSeriesMetrics,
  CioTransactionalListResponse,
} from "./types"

// =============================================================================
// Windows
// =============================================================================

/**
 * The widest window the link-metrics endpoints allow: "Maximums are 24 hours,
 * 45 days, 12 weeks, or 121 months." 121 months reaches ~10 years back, which is
 * what makes a lifetime click history of the whole archive possible at all.
 */
export const LIFETIME_PERIOD = "months" as const
export const LIFETIME_STEPS = 121

/** Campaign-dialect equivalent of the lifetime window. */
function lifetimeV2Window(): { start: number; end: number } {
  const end = Math.floor(Date.now() / 1000)
  const start = end - 121 * 31 * 24 * 60 * 60
  return { start, end }
}

export type ClickBasis = "human" | "all"

// =============================================================================
// Series helpers
// =============================================================================

/** Sum a per-bucket series, treating null/absent buckets as zero. */
export function sumSeries(series: (number | null)[] | undefined): number {
  if (!series) return 0
  let total = 0
  for (const v of series) if (typeof v === "number") total += v
  return total
}

/** Flatten a `{ metric: { series: { sent: [...] } } }` payload into totals. */
export function seriesTotals(data: CioSeriesMetrics | null | undefined): Record<string, number> {
  const series = data?.metric?.series
  if (!series) return {}
  const totals: Record<string, number> = {}
  for (const [key, values] of Object.entries(series)) totals[key] = sumSeries(values)
  return totals
}

// =============================================================================
// Link metrics — shared across all four surfaces
// =============================================================================

function linkQuery(opts: { unique?: boolean; type?: string } = {}): string {
  const qs = new URLSearchParams({
    period: LIFETIME_PERIOD,
    steps: String(LIFETIME_STEPS),
  })
  // `type=email` keeps push/SMS steps of a mixed journey out of the click data.
  qs.set("type", opts.type ?? "email")
  if (opts.unique) qs.set("unique", "true")
  return qs.toString()
}

/**
 * Fetch per-link clicks for any surface.
 *
 * `unique=true` collapses repeat clicks by the same person, so one enthusiastic
 * reader can't outweigh several distinct ones.
 */
async function getLinks(path: string, unique: boolean): Promise<CioLinkMetric[]> {
  const res = await cioGet<CioLinkMetricsResponse>(`${path}?${linkQuery({ unique })}`, {
    tolerate404: true,
  })
  return res?.links ?? []
}

export function newsletterLinks(id: number, unique: boolean) {
  return getLinks(`/newsletters/${id}/metrics/links`, unique)
}

export function newsletterVariantLinks(id: number, variantId: number, unique: boolean) {
  return getLinks(`/newsletters/${id}/variants/${variantId}/metrics/links`, unique)
}

export function campaignActionLinks(campaignId: number, actionId: number, unique: boolean) {
  return getLinks(`/campaigns/${campaignId}/actions/${actionId}/metrics/links`, unique)
}

export function broadcastActionLinks(broadcastId: number, actionId: number, unique: boolean) {
  return getLinks(`/broadcasts/${broadcastId}/actions/${actionId}/metrics/links`, unique)
}

export function transactionalLinks(id: number, unique: boolean) {
  return getLinks(`/transactional/${id}/metrics/links`, unique)
}

// =============================================================================
// Newsletters
// =============================================================================

/** List every newsletter, following `next` cursors to the end. */
export async function listNewsletters() {
  const all = []
  let start: string | undefined
  for (let page = 0; page < 100; page++) {
    const qs = new URLSearchParams({ limit: "100" })
    if (start) qs.set("start", start)
    const res = await cioGet<CioNewslettersResponse>(`/newsletters?${qs}`)
    all.push(...(res?.newsletters ?? []))
    if (!res?.next) break
    start = res.next
  }
  return all
}

/** A newsletter's variants — where `body`, `layout`, and `subject` live. */
export async function getNewsletterContents(id: number) {
  const res = await cioGet<CioNewsletterContentsResponse>(`/newsletters/${id}/contents`, {
    tolerate404: true,
  })
  return res?.contents ?? []
}

export async function getNewsletterMetrics(id: number): Promise<CioSeriesMetrics | null> {
  return cioGet<CioSeriesMetrics>(
    `/newsletters/${id}/metrics?period=${LIFETIME_PERIOD}&steps=${LIFETIME_STEPS}`,
    { tolerate404: true },
  )
}

// =============================================================================
// Campaigns
// =============================================================================

export async function listCampaigns() {
  const res = await cioGet<CioCampaignsResponse>("/campaigns")
  return res?.campaigns ?? []
}

/**
 * A campaign's actions, with `body`/`layout` retained.
 *
 * mOperator's equivalent strips the HTML on the way through; the catalogue is
 * the reason to keep it.
 */
export async function listCampaignActions(campaignId: number): Promise<CioAction[]> {
  const actions: CioAction[] = []
  let start: string | undefined
  for (let page = 0; page < 20; page++) {
    const qs = start ? `?start=${encodeURIComponent(start)}` : ""
    const res = await cioGet<CioActionsResponse>(`/campaigns/${campaignId}/actions${qs}`, {
      tolerate404: true,
    })
    actions.push(...(res?.actions ?? []))
    if (!res?.next) break
    start = res.next
  }
  return actions
}

export async function getCampaignActionMetrics(
  campaignId: number,
  actionId: number,
): Promise<CioSeriesMetrics | null> {
  const { start, end } = lifetimeV2Window()
  const qs = new URLSearchParams({
    version: "2",
    res: "monthly",
    tz: "America/New_York",
    start: String(start),
    end: String(end),
    type: "email",
  })
  return cioGet<CioSeriesMetrics>(`/campaigns/${campaignId}/actions/${actionId}/metrics?${qs}`, {
    tolerate404: true,
  })
}

// =============================================================================
// Broadcasts
// =============================================================================

export async function listBroadcasts() {
  const res = await cioGet<CioBroadcastsResponse>("/broadcasts")
  return res?.broadcasts ?? []
}

/** Broadcast actions mirror campaign actions, including the `body` field. */
export async function listBroadcastActions(broadcastId: number): Promise<CioAction[]> {
  const res = await cioGet<CioActionsResponse>(`/broadcasts/${broadcastId}/actions`, {
    tolerate404: true,
  })
  return res?.actions ?? []
}

/**
 * One broadcast action. Used as a fallback when the list endpoint omits `body`
 * — the probe checks whether that's the case.
 */
export async function getBroadcastAction(broadcastId: number, actionId: number) {
  return cioGet<{ action?: CioAction } & CioAction>(
    `/broadcasts/${broadcastId}/actions/${actionId}`,
    { tolerate404: true },
  )
}

export async function getBroadcastMetrics(broadcastId: number): Promise<CioSeriesMetrics | null> {
  return cioGet<CioSeriesMetrics>(
    `/broadcasts/${broadcastId}/metrics?period=${LIFETIME_PERIOD}&steps=${LIFETIME_STEPS}`,
    { tolerate404: true },
  )
}

// =============================================================================
// Transactional
// =============================================================================

export async function listTransactional() {
  const res = await cioGet<CioTransactionalListResponse>("/transactional")
  return res?.transactional ?? []
}

/**
 * One transactional template's content.
 *
 * The App API reference doesn't document where the body lives for these, so both
 * plausible paths are tried; the probe records which one answers.
 */
export async function getTransactionalContent(id: number) {
  const direct = await cioGet<Record<string, unknown>>(`/transactional/${id}`, { tolerate404: true })
  if (direct) return direct
  return cioGet<Record<string, unknown>>(`/transactional/${id}/contents`, { tolerate404: true })
}

export async function getTransactionalMetrics(id: number): Promise<CioSeriesMetrics | null> {
  return cioGet<CioSeriesMetrics>(
    `/transactional/${id}/metrics?period=${LIFETIME_PERIOD}&steps=${LIFETIME_STEPS}`,
    { tolerate404: true },
  )
}
