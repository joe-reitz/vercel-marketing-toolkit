/**
 * The snapshot schema — what `npm run ingest` writes and the site reads.
 *
 * Split in two on purpose: `index.json` holds only what the index page needs, so
 * browsing thousands of emails doesn't mean parsing every HTML body. Full records
 * live one file per email and are read on demand.
 */

export type EmailSurface = "newsletter" | "campaign" | "broadcast" | "transactional"

export const SURFACE_LABELS: Record<EmailSurface, string> = {
  newsletter: "Newsletter",
  campaign: "Journey",
  broadcast: "Broadcast",
  transactional: "Transactional",
}

// =============================================================================
// Clicks
// =============================================================================

/**
 * The three series Customer.io returns for every link, in one shape.
 *
 * `all` includes machine clicks; `human` excludes them; `machine` is kept so the
 * viewer can show how much of a link's traffic was scanners rather than people.
 */
export interface ClickCounts {
  all: number
  human: number
  machine: number
}

/**
 * One tracked link. Both dedup modes are stored because a single API response
 * carries all three series — so `unique=true` and `unique=false` (two calls
 * total) cover every basis the viewer offers, with no per-toggle refetch.
 */
export interface CatalogueLink {
  /** Customer.io's own link id. */
  cioLinkId?: number
  /** The destination URL, as Customer.io reports it. This is the match key. */
  href: string
  /** Repeat clicks by one person collapsed to one. */
  unique: ClickCounts
  /** Every click event, repeats included. */
  raw: ClickCounts
}

/** Which number drives the heatmap. Defaults to unique + human. */
export interface ClickBasis {
  dedupe: "unique" | "raw"
  audience: "human" | "all"
}

export const DEFAULT_BASIS: ClickBasis = { dedupe: "unique", audience: "human" }

export function clicksFor(link: CatalogueLink, basis: ClickBasis): number {
  const counts = basis.dedupe === "unique" ? link.unique : link.raw
  return basis.audience === "human" ? counts.human : counts.all
}

// =============================================================================
// Metrics
// =============================================================================

export interface EmailMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  /** True when Customer.io returned no metrics payload at all for this email. */
  unavailable?: boolean
}

// =============================================================================
// Emails
// =============================================================================

/** Where this email came from in Customer.io, for deep-linking and refetching. */
export interface CioProvenance {
  newsletterId?: number
  campaignId?: number
  broadcastId?: number
  transactionalId?: number
  actionId?: number
  variantId?: number
}

/** The index-page view of an email — no HTML, no links. */
export interface CatalogueIndexEntry {
  /** Stable composite id, e.g. "newsletter-123-1" or "campaign-45-678". */
  id: string
  surface: EmailSurface
  name: string
  subject?: string
  /** Parent campaign/broadcast name, for journey steps that need context. */
  parentName?: string
  variantName?: string
  created?: number
  updated?: number
  tags?: string[]
  metrics: EmailMetrics
  /** Total tracked links, and total clicks at the default basis. */
  linkCount: number
  totalClicks: number
  hasBody: boolean
}

/** The full record, read when one email is opened. */
export interface CatalogueEmail extends CatalogueIndexEntry {
  cio: CioProvenance
  preheader?: string
  from?: string
  /** Outer HTML shell with a `{{ content }}` slot. May be absent. */
  layout?: string
  /** The email's own HTML. */
  body?: string
  links: CatalogueLink[]
  /**
   * Set when link metrics could only be read at the parent level, so the counts
   * cover every A/B variant rather than this one. Surfaced in the viewer — an
   * aggregated number must not be read as this variant's own.
   */
  linksAggregatedAcrossVariants?: boolean
  /** Explains an absent body rather than rendering a blank frame. */
  bodyMissingReason?: string
  /** Plain-text extract of the body, for index search. */
  searchText?: string
}

export interface CatalogueIndex {
  generatedAt: string
  /**
   * True when the snapshot came from scripts/fixture.ts rather than a real
   * ingest. Surfaced prominently in the UI: the fixture's numbers are plausible
   * enough to be mistaken for real ones, and a screenshot of synthetic metrics
   * presented as real performance data would be worse than no catalogue at all.
   */
  isFixture?: boolean
  /** Per-surface counts, including how many were skipped and why. */
  stats: {
    total: number
    bySurface: Record<string, number>
    withoutBody: number
    skippedUnsent: number
  }
  emails: CatalogueIndexEntry[]
}
