/**
 * Customer.io App API response shapes — the read-only subset the catalogue needs.
 *
 * Field names verified against ~/Documents/Github/vercel-moperator
 * (src/lib/customerio/types.ts), which has been exercised against the live API.
 * Everything is optional where Customer.io may omit it; the docs explicitly warn
 * that fields get added over time, so treat these as a floor, not a contract.
 */

// =============================================================================
// Link metrics — the heatmap's data source
// =============================================================================

/**
 * Per-bucket click arrays, one entry per period step.
 *
 * `clicked` includes machine/scanner clicks; `human_clicked` excludes them.
 * Email security scanners inflate raw click counts enough to visibly distort a
 * heatmap, which is why the viewer defaults to human clicks.
 */
export interface CioLinkSeries {
  clicked?: (number | null)[]
  human_clicked?: (number | null)[]
  machine_clicked?: (number | null)[]
}

export interface CioLinkMetric {
  /** `id` is Customer.io's link id; `href` is the destination URL we match on. */
  link?: { id?: number; href?: string }
  metric?: { series?: CioLinkSeries }
}

export interface CioLinkMetricsResponse {
  links?: CioLinkMetric[]
}

// =============================================================================
// Newsletters — one-off sends
// =============================================================================

export interface CioNewsletter {
  id: number
  name: string
  type?: string
  state?: string
  created?: number
  updated?: number
  tags?: string[]
}

export interface CioNewslettersResponse {
  newsletters?: CioNewsletter[]
  next?: string
}

/** One variant (A/B arm or language) of a newsletter — carries the HTML. */
export interface CioNewsletterContent {
  id: number
  newsletter_id?: number
  name?: string
  /** Outer HTML shell; the body is substituted into its `{{ content }}` slot. */
  layout?: string
  body?: string
  language?: string
  type?: string
  subject?: string
  preheader_text?: string
  from?: string
}

export interface CioNewsletterContentsResponse {
  contents?: CioNewsletterContent[]
}

// =============================================================================
// Campaigns — journey / lifecycle emails
// =============================================================================

export interface CioCampaign {
  id: number
  name: string
  type?: string
  state?: string
  active?: boolean
  created?: number
  updated?: number
  tags?: string[]
}

export interface CioCampaignsResponse {
  campaigns?: CioCampaign[]
}

/**
 * A campaign action — one step in a journey. Email steps carry `body` + `layout`.
 *
 * Note: mOperator's `listCampaignActions` deliberately strips `body` (see the
 * comment at vercel-moperator/src/lib/customerio/client.ts:274). The catalogue
 * exists to keep it.
 */
export interface CioAction {
  /**
   * Customer.io returns this as a STRING ("729") even though
   * `parent_action_id` on the same object is a NUMBER. Compare the two only
   * after normalising — see abContainerIds() in scripts/ingest.ts.
   */
  id: number
  campaign_id?: number
  parent_action_id?: number
  name?: string
  type?: string
  subject?: string
  layout?: string
  body?: string
  body_amp?: string
  sending_state?: string
  created?: number
  updated?: number
}

export interface CioActionsResponse {
  actions?: CioAction[]
  next?: string
}

// =============================================================================
// Broadcasts — API-triggered sends (mirrors the campaign shape)
// =============================================================================

export interface CioBroadcast {
  id: number
  name: string
  type?: string
  state?: string
  active?: boolean
  created?: number
  updated?: number
  tags?: string[]
}

export interface CioBroadcastsResponse {
  broadcasts?: CioBroadcast[]
}

// =============================================================================
// Transactional templates
// =============================================================================

export interface CioTransactionalMessage {
  id: number
  name?: string
  subject?: string
  layout?: string
  body?: string
  created?: number
  updated?: number
  [key: string]: unknown
}

export interface CioTransactionalListResponse {
  transactional?: CioTransactionalMessage[]
}

// =============================================================================
// Aggregate metrics — `{ metric: { series: { sent: [...], ... } } }`
// =============================================================================

export interface CioSeriesMetrics {
  metric?: {
    series?: Record<string, (number | null)[] | undefined>
  }
}
