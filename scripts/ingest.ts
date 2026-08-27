/**
 * Build the catalogue snapshot from Customer.io.
 *
 * Walks all four email surfaces, pulls each email's HTML and per-link click
 * metrics, and writes:
 *
 *   data/index.json        metadata for every email (drives the index page)
 *   data/emails/{id}.json  one full record each (HTML + links + metrics)
 *
 * Why a snapshot rather than live calls: a full sweep is roughly four requests
 * per email against a documented 10-per-second ceiling. Paying that once per
 * night is fine; paying it per visitor is not.
 *
 * Two link-metrics calls are made per email (`unique=true` and `unique=false`).
 * Each response carries the `clicked`, `human_clicked`, and `machine_clicked`
 * series together, so those two calls cover every click basis the viewer offers
 * and the toggle never needs to refetch.
 *
 * Usage:
 *   npm run ingest                          full sweep
 *   npm run ingest -- --limit 5             first 5 emails per surface
 *   npm run ingest -- --type newsletter     one surface only
 *   npm run ingest -- --force               re-fetch bodies even if unchanged
 *   npm run ingest -- --include-drafts      keep emails that never sent
 */

import { config as loadEnv } from "dotenv"
import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

if (existsSync(".env.local")) loadEnv({ path: ".env.local" })
else loadEnv()

import {
  broadcastActionLinks,
  campaignActionLinks,
  getBroadcastAction,
  getBroadcastMetrics,
  getCampaignActionMetrics,
  getNewsletterContents,
  getNewsletterMetrics,
  getTransactionalContent,
  getTransactionalMetrics,
  listBroadcastActions,
  listBroadcasts,
  listCampaignActions,
  listCampaigns,
  listNewsletters,
  listTransactional,
  newsletterLinks,
  newsletterVariantLinks,
  seriesTotals,
  sumSeries,
  transactionalLinks,
} from "../src/lib/cio/client"
import type { CioAction, CioLinkMetric } from "../src/lib/cio/types"
import { mergeEquivalentLinks } from "../src/lib/catalogue/match"
import { composeEmailHtml, extractSearchText } from "../src/lib/catalogue/render"
import { readEmail, readIndex } from "../src/lib/catalogue/snapshot"
import {
  DEFAULT_BASIS,
  clicksFor,
  type CatalogueEmail,
  type CatalogueIndex,
  type CatalogueIndexEntry,
  type CatalogueLink,
  type EmailMetrics,
  type EmailSurface,
} from "../src/lib/catalogue/types"

// =============================================================================
// Args
// =============================================================================

const argv = process.argv.slice(2)
function flag(name: string): boolean {
  return argv.includes(`--${name}`)
}
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

const LIMIT = arg("limit") ? Number(arg("limit")) : Infinity
const ONLY_TYPE = arg("type") as EmailSurface | undefined
const FORCE = flag("force")
const INCLUDE_DRAFTS = flag("include-drafts")

const DATA_DIR = path.join(process.cwd(), "data")

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map with bounded concurrency.
 *
 * The rate limiter in request.ts already paces requests, so this exists only to
 * keep the pipe full — without it every request waits a full round trip before
 * the next is even queued.
 */
async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

/** Convert Customer.io's metric series into flat lifetime totals. */
function toMetrics(data: Awaited<ReturnType<typeof getNewsletterMetrics>>): EmailMetrics {
  if (!data?.metric?.series) {
    return { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, unavailable: true }
  }
  const t = seriesTotals(data)
  return {
    sent: t.sent ?? 0,
    delivered: t.delivered ?? 0,
    opened: t.opened ?? 0,
    clicked: t.clicked ?? 0,
    bounced: t.bounced ?? 0,
    unsubscribed: t.unsubscribed ?? 0,
  }
}

/** Fold the two link-metrics responses into one link list. */
function toLinks(uniqueRes: CioLinkMetric[], rawRes: CioLinkMetric[]): CatalogueLink[] {
  const byHref = new Map<string, CatalogueLink>()

  const ingest = (entries: CioLinkMetric[], mode: "unique" | "raw") => {
    for (const entry of entries) {
      const href = entry.link?.href
      if (!href) continue
      const existing = byHref.get(href) ?? {
        cioLinkId: entry.link?.id,
        href,
        unique: { all: 0, human: 0, machine: 0 },
        raw: { all: 0, human: 0, machine: 0 },
      }
      const counts = {
        all: sumSeries(entry.metric?.series?.clicked),
        human: sumSeries(entry.metric?.series?.human_clicked),
        machine: sumSeries(entry.metric?.series?.machine_clicked),
      }
      existing[mode] = counts
      if (entry.link?.id != null) existing.cioLinkId = entry.link.id
      byHref.set(href, existing)
    }
  }

  ingest(uniqueRes, "unique")
  ingest(rawRes, "raw")
  // Customer.io can report one destination under several hrefs (typically the
  // same URL with and without entity escaping). Merge them so the clicks land
  // in one number instead of colliding and being dropped as ambiguous.
  return mergeEquivalentLinks(Array.from(byHref.values()))
}

/** Email steps only — journeys also contain SMS, push, and webhook actions. */
function emailActions(actions: CioAction[]): CioAction[] {
  return actions.filter((a) => a.type === "email" || (!a.type && a.body) || Boolean(a.body))
}

interface Collected {
  entry: CatalogueEmail
}

const stats = { skippedUnsent: 0, withoutBody: 0, reusedBody: 0 }

/**
 * Decide whether an email counts as "sent".
 *
 * When Customer.io returns no metrics at all we keep the email rather than drop
 * it — silently omitting something we couldn't measure would make the archive
 * quietly incomplete.
 */
function wasSent(metrics: EmailMetrics): boolean {
  if (INCLUDE_DRAFTS) return true
  if (metrics.unavailable) return true
  return metrics.sent > 0
}

// =============================================================================
// Surfaces
// =============================================================================

async function collectNewsletters(prior: Map<string, CatalogueIndexEntry>): Promise<Collected[]> {
  const newsletters = (await listNewsletters()).slice(0, LIMIT)
  console.log(`newsletters: ${newsletters.length}`)

  const out = await mapPool(newsletters, 4, async (n) => {
    const contents = await getNewsletterContents(n.id)
    const metrics = toMetrics(await getNewsletterMetrics(n.id))
    if (!wasSent(metrics)) {
      stats.skippedUnsent++
      return []
    }

    const results: Collected[] = []
    for (const variant of contents.length ? contents : [null]) {
      const variantId = variant?.id
      const id = `newsletter-${n.id}${variantId != null ? `-${variantId}` : ""}`

      // With one variant, newsletter-level link metrics ARE this variant's. With
      // several, try the variant endpoint first and only fall back to the
      // aggregate — flagged, so the viewer can say the number isn't variant-specific.
      let uniqueLinks: CioLinkMetric[] = []
      let rawLinks: CioLinkMetric[] = []
      let aggregated = false

      if (contents.length > 1 && variantId != null) {
        uniqueLinks = await newsletterVariantLinks(n.id, variantId, true)
        rawLinks = await newsletterVariantLinks(n.id, variantId, false)
        if (!uniqueLinks.length) {
          uniqueLinks = await newsletterLinks(n.id, true)
          rawLinks = await newsletterLinks(n.id, false)
          aggregated = true
        }
      } else {
        uniqueLinks = await newsletterLinks(n.id, true)
        rawLinks = await newsletterLinks(n.id, false)
      }

      results.push({
        entry: await buildEmail({
          id,
          surface: "newsletter",
          name: n.name,
          subject: variant?.subject,
          parentName: contents.length > 1 ? n.name : undefined,
          variantName: contents.length > 1 ? (variant?.name ?? variant?.language) : undefined,
          created: n.created,
          updated: n.updated,
          tags: n.tags,
          cio: { newsletterId: n.id, variantId },
          preheader: variant?.preheader_text,
          from: variant?.from,
          layout: variant?.layout,
          body: variant?.body,
          metrics,
          links: toLinks(uniqueLinks, rawLinks),
          linksAggregatedAcrossVariants: aggregated,
          prior,
        }),
      })
    }
    return results
  })

  return out.flat()
}

async function collectCampaigns(prior: Map<string, CatalogueIndexEntry>): Promise<Collected[]> {
  const campaigns = (await listCampaigns()).slice(0, LIMIT)
  console.log(`campaigns: ${campaigns.length}`)

  const out = await mapPool(campaigns, 3, async (c) => {
    const actions = emailActions(await listCampaignActions(c.id))
    const results: Collected[] = []

    for (const a of actions) {
      const metrics = toMetrics(await getCampaignActionMetrics(c.id, a.id))
      if (!wasSent(metrics)) {
        stats.skippedUnsent++
        continue
      }
      const [uniqueLinks, rawLinks] = [
        await campaignActionLinks(c.id, a.id, true),
        await campaignActionLinks(c.id, a.id, false),
      ]
      results.push({
        entry: await buildEmail({
          id: `campaign-${c.id}-${a.id}`,
          surface: "campaign",
          name: a.name || a.subject || `Action ${a.id}`,
          subject: a.subject,
          parentName: c.name,
          created: a.created ?? c.created,
          updated: a.updated ?? c.updated,
          tags: c.tags,
          cio: { campaignId: c.id, actionId: a.id },
          layout: a.layout,
          body: a.body,
          metrics,
          links: toLinks(uniqueLinks, rawLinks),
          prior,
        }),
      })
    }
    return results
  })

  return out.flat()
}

async function collectBroadcasts(prior: Map<string, CatalogueIndexEntry>): Promise<Collected[]> {
  const broadcasts = (await listBroadcasts()).slice(0, LIMIT)
  console.log(`broadcasts: ${broadcasts.length}`)

  const out = await mapPool(broadcasts, 3, async (b) => {
    const actions = emailActions(await listBroadcastActions(b.id))
    // Broadcast metrics are only available at the broadcast level, so a
    // multi-action broadcast shares one set of totals across its steps.
    const metrics = toMetrics(await getBroadcastMetrics(b.id))
    if (!wasSent(metrics)) {
      stats.skippedUnsent++
      return []
    }

    const results: Collected[] = []
    for (const a of actions) {
      // The probe checks whether the list endpoint includes `body`; when it
      // doesn't, the single-action endpoint is the fallback.
      let body = a.body
      let layout = a.layout
      if (!body) {
        const single = await getBroadcastAction(b.id, a.id)
        const unwrapped = (single as { action?: CioAction })?.action ?? (single as CioAction | null)
        body = unwrapped?.body
        layout = unwrapped?.layout ?? layout
      }

      const [uniqueLinks, rawLinks] = [
        await broadcastActionLinks(b.id, a.id, true),
        await broadcastActionLinks(b.id, a.id, false),
      ]

      results.push({
        entry: await buildEmail({
          id: `broadcast-${b.id}-${a.id}`,
          surface: "broadcast",
          name: a.name || a.subject || b.name,
          subject: a.subject,
          parentName: b.name,
          created: a.created ?? b.created,
          updated: a.updated ?? b.updated,
          tags: b.tags,
          cio: { broadcastId: b.id, actionId: a.id },
          layout,
          body,
          metrics,
          links: toLinks(uniqueLinks, rawLinks),
          prior,
        }),
      })
    }
    return results
  })

  return out.flat()
}

async function collectTransactional(prior: Map<string, CatalogueIndexEntry>): Promise<Collected[]> {
  const templates = (await listTransactional()).slice(0, LIMIT)
  console.log(`transactional: ${templates.length}`)

  return mapPool(templates, 4, async (t) => {
    const metrics = toMetrics(await getTransactionalMetrics(t.id))
    if (!wasSent(metrics)) {
      stats.skippedUnsent++
      return null
    }
    const content = (await getTransactionalContent(t.id)) ?? {}
    // The content path isn't documented, so find the body by shape rather than
    // by a hardcoded key name. The probe reports which key actually answers.
    const record = ((content as { transactional?: Record<string, unknown> }).transactional ??
      content) as Record<string, unknown>
    const body = pickString(record, ["body", "html", "body_html", "content"])
    const layout = pickString(record, ["layout"])

    const [uniqueLinks, rawLinks] = [
      await transactionalLinks(t.id, true),
      await transactionalLinks(t.id, false),
    ]

    return {
      entry: await buildEmail({
        id: `transactional-${t.id}`,
        surface: "transactional",
        name: t.name || `Transactional ${t.id}`,
        subject: pickString(record, ["subject"]) ?? t.subject,
        created: t.created,
        updated: t.updated,
        cio: { transactionalId: t.id },
        layout,
        body,
        metrics,
        links: toLinks(uniqueLinks, rawLinks),
        prior,
      }),
    }
  }).then((r) => r.filter(Boolean) as Collected[])
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  return undefined
}

// =============================================================================
// Record assembly
// =============================================================================

interface BuildInput
  extends Omit<CatalogueEmail, "linkCount" | "totalClicks" | "hasBody" | "searchText" | "metrics"> {
  metrics: EmailMetrics
  prior: Map<string, CatalogueIndexEntry>
}

async function buildEmail(input: BuildInput): Promise<CatalogueEmail> {
  const { prior, ...rest } = input
  let { body, layout } = rest

  // Incremental: if this email's `updated` stamp is unchanged, the HTML can't
  // have changed either — reuse the stored copy and skip the content fetch cost
  // on the next run. Metrics and links are always refreshed.
  if (!body && !FORCE) {
    const previous = prior.get(rest.id)
    if (previous && previous.updated === rest.updated) {
      const stored = await readEmail(rest.id)
      if (stored?.body) {
        body = stored.body
        layout = stored.layout
        stats.reusedBody++
      }
    }
  }

  const hasBody = Boolean(body)
  if (!hasBody) stats.withoutBody++

  const composed = hasBody ? composeEmailHtml({ layout, body }) : ""
  const totalClicks = rest.links.reduce((sum, l) => sum + clicksFor(l, DEFAULT_BASIS), 0)

  return {
    ...rest,
    body,
    layout,
    hasBody,
    bodyMissingReason: hasBody ? undefined : "Customer.io returned no HTML body for this message.",
    linkCount: rest.links.length,
    totalClicks,
    searchText: composed ? extractSearchText(composed) : undefined,
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const startedAt = Date.now()
  console.log(`Ingest starting${ONLY_TYPE ? ` (type=${ONLY_TYPE})` : ""}${FORCE ? " [force]" : ""}\n`)

  const priorIndex = await readIndex()
  const prior = new Map(priorIndex.emails.map((e) => [e.id, e]))
  if (prior.size) console.log(`prior snapshot: ${prior.size} emails\n`)

  const collected: Collected[] = []
  const run = async (surface: EmailSurface, fn: () => Promise<Collected[]>) => {
    if (ONLY_TYPE && ONLY_TYPE !== surface) return
    collected.push(...(await fn()))
  }

  await run("newsletter", () => collectNewsletters(prior))
  await run("campaign", () => collectCampaigns(prior))
  await run("broadcast", () => collectBroadcasts(prior))
  await run("transactional", () => collectTransactional(prior))

  // Newest first — an archive is browsed from the recent end.
  collected.sort((a, b) => (b.entry.created ?? 0) - (a.entry.created ?? 0))

  await mkdir(path.join(DATA_DIR, "emails"), { recursive: true })
  for (const { entry } of collected) {
    await writeFile(path.join(DATA_DIR, "emails", `${entry.id}.json`), JSON.stringify(entry, null, 2))
  }

  const bySurface: Record<string, number> = {}
  for (const { entry } of collected) bySurface[entry.surface] = (bySurface[entry.surface] ?? 0) + 1

  const index: CatalogueIndex = {
    generatedAt: new Date().toISOString(),
    stats: {
      total: collected.length,
      bySurface,
      withoutBody: stats.withoutBody,
      skippedUnsent: stats.skippedUnsent,
    },
    // Strip the heavy fields — the index page never needs HTML or link lists.
    emails: collected.map(({ entry }) => ({
      id: entry.id,
      surface: entry.surface,
      name: entry.name,
      subject: entry.subject,
      parentName: entry.parentName,
      variantName: entry.variantName,
      created: entry.created,
      updated: entry.updated,
      tags: entry.tags,
      metrics: entry.metrics,
      linkCount: entry.linkCount,
      totalClicks: entry.totalClicks,
      hasBody: entry.hasBody,
    })),
  }

  await writeFile(path.join(DATA_DIR, "index.json"), JSON.stringify(index, null, 2))

  const seconds = Math.round((Date.now() - startedAt) / 1000)
  console.log(`\nWrote ${collected.length} emails in ${seconds}s`)
  console.log(`  by surface: ${JSON.stringify(bySurface)}`)
  console.log(`  without body: ${stats.withoutBody}`)
  console.log(`  skipped (never sent): ${stats.skippedUnsent}`)
  if (stats.reusedBody) console.log(`  reused unchanged bodies: ${stats.reusedBody}`)
}

/**
 * Exported so the build wrapper (scripts/build-ingest.ts) can call it and decide
 * for itself what a failure means. A failed ingest during a deploy should not
 * exit(1) and take the whole build down with it.
 */
export { main as runIngest }

/**
 * Only self-execute when run as a command (`npm run catalogue:ingest`), not when
 * imported. Without this guard, importing the module would kick off a full sweep
 * as a side effect.
 */
const executedDirectly = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return fileURLToPath(import.meta.url) === path.resolve(entry)
  } catch {
    return false
  }
})()

if (executedDirectly) {
  main().catch((err) => {
    console.error("\nIngest failed:", err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
