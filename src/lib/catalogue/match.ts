/**
 * Matching rendered `<a href>` values to Customer.io's reported link metrics.
 *
 * This is the load-bearing piece of the heatmap. Customer.io reports clicks
 * keyed by destination href, so accuracy depends entirely on deciding whether
 * an anchor in the HTML and a href in the metrics are the same link.
 *
 * Three tiers, tried in order, each looser than the last:
 *
 *   1. `exact`      — byte-identical after entity decoding.
 *   2. `normalized` — same URL ignoring tracking params, param order,
 *                     trailing slash, and case in scheme/host.
 *   3. `path`       — same host + path, ignoring the query string entirely.
 *
 * Two rules keep this honest rather than merely generous:
 *
 *   - A tier that would match one anchor to two different links is treated as a
 *     failure at that tier, not a coin flip. Ambiguity is reported, never guessed.
 *   - Anchors whose href contains Liquid (`{{ ... }}`) are marked `templated`.
 *     Their real destination was only decided at send time, so they cannot be
 *     matched, and the viewer must say so rather than render them cold.
 */

// =============================================================================
// Normalization
// =============================================================================

/**
 * Params that identify a campaign rather than a destination. Stripped from both
 * sides before comparing — what matters is that stripping is symmetric.
 */
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "mkt_tok",
  "gclid",
  "fbclid",
  "msclkid",
  "twclid",
  "_hsenc",
  "_hsmi",
  "mc_cid",
  "mc_eid",
  "cio_id",
  // Customer.io appends this to tracked links by default for workspaces created
  // after 2021-07-12. Note the leading underscore — stripping only "cio_id"
  // silently missed it and pushed matches down to the weaker path tier.
  "_cio_id",
  "ck_subscriber_id",
])

/** Schemes that are never trackable web destinations. */
const NON_WEB_SCHEMES = /^(mailto:|tel:|sms:|javascript:|data:)/i

/**
 * Customer.io's own link tag: `{% cio_link url:https://x.com track:false %}`.
 *
 * Worth resolving rather than treating as opaque Liquid. The destination is
 * stated literally in `url:`, so a link authored this way is fully matchable —
 * without this, every such link renders amber "not attributable" despite its
 * target being right there in the tag.
 *
 * `track:false` is a deliberate authoring decision to not track that one link
 * (Customer.io recommends it for password resets and other sensitive URLs), so
 * it's reported separately from "we couldn't find tracking".
 */
const CIO_LINK = /\{%\s*cio_link\s+([\s\S]*?)%\}/i

export interface CioLinkTag {
  url: string | null
  track: boolean
}

function tagParam(body: string, name: string): string | null {
  // Docs show unquoted colon-delimited values; quotes are accepted defensively
  // because the docs don't rule them out and authors reach for them.
  const m = body.match(new RegExp(`\\b${name}\\s*:\\s*(?:"([^"]*)"|'([^']*)'|(\\S+))`, "i"))
  if (!m) return null
  return m[1] ?? m[2] ?? m[3] ?? null
}

export function resolveCioLink(href: string): CioLinkTag | null {
  const match = href.match(CIO_LINK)
  if (!match) return null
  const body = match[1] ?? ""
  const url = tagParam(body, "url")
  // `track` defaults to true per the tag's documented behaviour.
  const track = (tagParam(body, "track") ?? "true").toLowerCase() !== "false"
  return { url: url && url.length > 0 ? url : null, track }
}

export function hasLiquid(href: string): boolean {
  return /\{\{|\{%/.test(href)
}

/**
 * Links that no click tracker could ever record: mail/phone schemes, in-document
 * anchors, and javascript: URLs.
 *
 * Kept distinct from "unmatched" on purpose. A mailto with no click data is
 * working as intended, and reporting it as a problem would be noise — which is
 * how warnings get trained away.
 */
export function isUntrackable(href: string): boolean {
  const clean = decodeEntities(href)
  return !clean || clean.startsWith("#") || NON_WEB_SCHEMES.test(clean)
}

/** Decode the HTML entities that survive into href attributes. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/g, "&")
    .replace(/&#x26;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim()
}

/**
 * Canonical form for tier-2 comparison: tracking params dropped, remaining
 * params sorted, trailing slash and scheme/host case normalized, hash dropped.
 *
 * Returns null when the value isn't a comparable web URL.
 */
export function normalizeUrl(rawHref: string): string | null {
  const href = decodeEntities(rawHref)
  if (!href || href.startsWith("#")) return null
  if (NON_WEB_SCHEMES.test(href)) return null

  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }

  // Array.from rather than spread: the toolkit targets es5, where spreading a
  // built-in iterator isn't permitted. Snapshotting the keys first also avoids
  // mutating the params while iterating them.
  Array.from(url.searchParams.keys()).forEach((param) => {
    if (TRACKING_PARAMS.has(param.toLowerCase())) url.searchParams.delete(param)
  })
  url.searchParams.sort()

  const protocol = url.protocol.toLowerCase()
  const host = url.host.toLowerCase()
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname
  const query = url.searchParams.toString()

  return `${protocol}//${host}${path}${query ? `?${query}` : ""}`
}

/** Tier-3 key: host + path only, with `www.` folded away. */
export function pathKey(rawHref: string): string | null {
  const normalized = normalizeUrl(rawHref)
  if (!normalized) return null
  try {
    const url = new URL(normalized)
    const host = url.host.replace(/^www\./, "")
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname
    return `${host}${path}`
  } catch {
    return null
  }
}

// =============================================================================
// Matching
// =============================================================================

export type MatchTier = "exact" | "normalized" | "path"

export interface AnchorMatch {
  /** The href exactly as authored in the HTML, cio_link tag and all. */
  href: string
  /** Index into the links array, or null when nothing matched. */
  linkIndex: number | null
  tier: MatchTier | null
  /** Href contains Liquid, so its destination wasn't fixed until send time. */
  templated: boolean
  /** mailto:/tel:/#/javascript: — inherently untrackable, not a failure. */
  untrackable: boolean
  /** Authored `{% cio_link ... track:false %}` — tracking deliberately off. */
  trackingDisabled: boolean
  /** Destination actually used for matching, after resolving a cio_link tag. */
  resolvedHref: string
  /** A tier matched more than one link, so no match was taken. */
  ambiguous: boolean
}

export interface MatchReport {
  anchors: AnchorMatch[]
  /** Indices of links no anchor matched — tracked clicks we can't place. */
  unmatchedLinkIndices: number[]
  /** linkIndex → how many anchors resolved to it. >1 means clicks aren't separable. */
  anchorsPerLink: Map<number, number>
}

interface HasHref {
  href: string
}

/** Build a key → indices index, so collisions are visible rather than silent. */
function buildIndex<T extends HasHref>(links: T[], keyOf: (href: string) => string | null) {
  const index = new Map<string, number[]>()
  links.forEach((link, i) => {
    const key = keyOf(link.href)
    if (!key) return
    const existing = index.get(key)
    if (existing) existing.push(i)
    else index.set(key, [i])
  })
  return index
}

/**
 * Resolve every anchor href against the tracked links.
 *
 * `anchorHrefs` should be in document order; the returned array is parallel to it
 * so callers can zip results back onto DOM nodes.
 */
export function matchAnchors<T extends HasHref>(anchorHrefs: string[], links: T[]): MatchReport {
  const exactIndex = buildIndex(links, (h) => decodeEntities(h) || null)
  const normalizedIndex = buildIndex(links, normalizeUrl)
  const pathIndex = buildIndex(links, pathKey)

  const anchorsPerLink = new Map<number, number>()
  const matchedLinks = new Set<number>()

  const anchors: AnchorMatch[] = anchorHrefs.map((rawHref) => {
    // Resolve Customer.io's link tag first: its `url:` is a literal destination,
    // so these are matchable even though the raw attribute is Liquid.
    const tag = resolveCioLink(rawHref)
    const href = tag?.url ?? rawHref
    const base = { href: rawHref, resolvedHref: href }

    if (tag && !tag.track) {
      // Tracking switched off for this link on purpose — no data expected.
      return {
        ...base,
        linkIndex: null,
        tier: null,
        templated: false,
        untrackable: false,
        trackingDisabled: true,
        ambiguous: false,
      }
    }

    const templated = hasLiquid(href)

    // A Liquid href had no fixed destination at authoring time. Attempting a
    // match here would mean inventing one.
    if (templated) {
      return {
        ...base,
        linkIndex: null,
        tier: null,
        templated: true,
        untrackable: false,
        trackingDisabled: false,
        ambiguous: false,
      }
    }

    if (isUntrackable(href)) {
      return {
        ...base,
        linkIndex: null,
        tier: null,
        templated: false,
        untrackable: true,
        trackingDisabled: false,
        ambiguous: false,
      }
    }

    const attempts: Array<{ tier: MatchTier; key: string | null; index: Map<string, number[]> }> = [
      { tier: "exact", key: decodeEntities(href) || null, index: exactIndex },
      { tier: "normalized", key: normalizeUrl(href), index: normalizedIndex },
      { tier: "path", key: pathKey(href), index: pathIndex },
    ]

    let ambiguous = false
    for (const { tier, key, index } of attempts) {
      if (!key) continue
      const hits = index.get(key)
      if (!hits || hits.length === 0) continue
      if (hits.length > 1) {
        // Several distinct tracked links collapse to this key. Picking one would
        // attribute clicks arbitrarily, so fall through to a stricter answer of
        // "we don't know".
        ambiguous = true
        continue
      }
      const linkIndex = hits[0]
      matchedLinks.add(linkIndex)
      anchorsPerLink.set(linkIndex, (anchorsPerLink.get(linkIndex) ?? 0) + 1)
      return {
        ...base,
        linkIndex,
        tier,
        templated: false,
        untrackable: false,
        trackingDisabled: false,
        ambiguous: false,
      }
    }

    return {
      ...base,
      linkIndex: null,
      tier: null,
      templated: false,
      untrackable: false,
      trackingDisabled: false,
      ambiguous,
    }
  })

  const unmatchedLinkIndices = links
    .map((_, i) => i)
    .filter((i) => !matchedLinks.has(i))

  return { anchors, unmatchedLinkIndices, anchorsPerLink }
}
