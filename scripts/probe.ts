/**
 * Read-only probe of the Customer.io App API.
 *
 * Follows the pattern of vercel-moperator/scripts/cio-evergreen-probe.ts: raw
 * GETs, no writes, run once to settle questions the docs don't answer. It exists
 * because three things could not be confirmed from the API reference:
 *
 *   1. Do broadcast actions return `body` the way campaign actions do, or does
 *      the HTML only appear on the single-action endpoint?
 *   2. Where does a transactional template's content live?
 *   3. Does Customer.io issue distinct link ids for two anchors sharing one
 *      href, or dedupe by href? This decides whether the heatmap can attribute
 *      clicks to a hero image and its CTA button separately, or must flag them
 *      as inseparable.
 *
 * It also prints per-surface counts, so ingest runtime is a known quantity
 * rather than a surprise.
 *
 * Usage:
 *   npm run probe
 *
 * Requires CUSTOMERIO_APP_API_KEY in .env.local (plus CUSTOMERIO_REGION=eu for
 * EU workspaces). App API bearer key — not the Track API site id/key pair.
 */

import { config as loadEnv } from "dotenv"
import { existsSync } from "node:fs"

if (existsSync(".env.local")) loadEnv({ path: ".env.local" })
else loadEnv()

import {
  campaignActionLinks,
  getNewsletterContents,
  getTransactionalContent,
  listBroadcastActions,
  listBroadcasts,
  listCampaignActions,
  listCampaigns,
  listNewsletters,
  listTransactional,
  newsletterLinks,
  getBroadcastAction,
} from "../src/lib/cio/client"

function heading(text: string) {
  console.log(`\n${"=".repeat(72)}\n${text}\n${"=".repeat(72)}`)
}

function preview(value: unknown, chars = 160): string {
  if (value == null) return String(value)
  const s = typeof value === "string" ? value : JSON.stringify(value)
  return s.length > chars ? `${s.slice(0, chars)}…` : s
}

async function main() {
  heading("Archive size (drives ingest runtime)")

  const [newsletters, campaigns, broadcasts, transactional] = await Promise.all([
    listNewsletters(),
    listCampaigns(),
    listBroadcasts(),
    listTransactional(),
  ])

  console.log(`newsletters:   ${newsletters.length}`)
  console.log(`campaigns:     ${campaigns.length}`)
  console.log(`broadcasts:    ${broadcasts.length}`)
  console.log(`transactional: ${transactional.length}`)

  // Actions per campaign is the real multiplier: each one is a separate email
  // and a separate link-metrics call.
  const sampleCampaigns = campaigns.slice(0, 5)
  let sampledActions = 0
  for (const c of sampleCampaigns) {
    const actions = await listCampaignActions(c.id)
    const emails = actions.filter((a) => a.type === "email" || a.body)
    sampledActions += emails.length
    console.log(`  campaign ${c.id} "${c.name}": ${actions.length} actions, ${emails.length} email steps`)
  }
  if (sampleCampaigns.length) {
    const avg = sampledActions / sampleCampaigns.length
    const estimate = Math.round(
      newsletters.length + campaigns.length * avg + broadcasts.length + transactional.length,
    )
    console.log(`\n~${avg.toFixed(1)} email steps per campaign (sampled ${sampleCampaigns.length})`)
    console.log(`estimated total emails: ~${estimate}`)
    // 1 content call + 2 link calls + 1 metrics call per email, at 8 req/s.
    console.log(`estimated ingest time: ~${Math.ceil((estimate * 4) / 8 / 60)} min at 8 req/s`)
  }

  heading("Q1 — do broadcast actions include `body`?")

  if (!broadcasts.length) {
    console.log("no broadcasts in this workspace; nothing to check")
  } else {
    const b = broadcasts[0]
    const actions = await listBroadcastActions(b.id)
    console.log(`broadcast ${b.id} "${b.name}": ${actions.length} actions from the list endpoint`)
    if (actions.length) {
      const a = actions[0]
      console.log(`  list endpoint  → body present: ${Boolean(a.body)}  layout present: ${Boolean(a.layout)}`)
      console.log(`  body preview: ${preview(a.body)}`)
      if (!a.body) {
        const single = await getBroadcastAction(b.id, a.id)
        const unwrapped = (single as { action?: typeof a })?.action ?? single
        console.log(`  single endpoint → body present: ${Boolean(unwrapped?.body)}`)
        console.log(`  ANSWER: fetch bodies from the single-action endpoint`)
      } else {
        console.log(`  ANSWER: the list endpoint is enough — mirrors campaigns`)
      }
    }
  }

  heading("Q2 — where does transactional content live?")

  if (!transactional.length) {
    console.log("no transactional templates in this workspace; nothing to check")
  } else {
    const t = transactional[0]
    console.log(`transactional ${t.id} "${t.name ?? "(unnamed)"}"`)
    console.log(`  list entry keys: ${Object.keys(t).join(", ")}`)
    const content = await getTransactionalContent(t.id)
    if (!content) {
      console.log("  neither /transactional/{id} nor /transactional/{id}/contents answered")
    } else {
      console.log(`  response keys: ${Object.keys(content).join(", ")}`)
      const bodyish = Object.entries(content).find(
        ([k, v]) => typeof v === "string" && /body|html|content/i.test(k) && v.length > 40,
      )
      console.log(`  ANSWER: body field → ${bodyish ? bodyish[0] : "NOT FOUND — inspect keys above"}`)
      if (bodyish) console.log(`  preview: ${preview(bodyish[1])}`)
    }
  }

  heading("Q3 — are link ids per-anchor or deduped by href?")
  console.log("Looking for a link set containing two entries with the same href.")
  console.log("Duplicate hrefs with distinct ids → clicks are separable per anchor.")
  console.log("Unique hrefs only → anchors sharing a URL share one count.\n")

  let verdict: string | null = null

  // Newsletters first: a one-off send is the likeliest place to find a hero
  // image and a CTA button pointing at the same URL.
  for (const n of newsletters.slice(0, 10)) {
    const links = await newsletterLinks(n.id, true)
    if (links.length < 2) continue
    const hrefs = links.map((l) => l.link?.href).filter(Boolean) as string[]
    const dupes = hrefs.filter((h, i) => hrefs.indexOf(h) !== i)
    console.log(`newsletter ${n.id}: ${links.length} links, ${new Set(hrefs).size} distinct hrefs`)
    if (dupes.length) {
      verdict = "PER-ANCHOR — duplicate hrefs carry distinct link ids; clicks are separable"
      console.log(`  duplicate href found: ${preview(dupes[0], 100)}`)
      break
    }
    if (links.length >= 3) {
      verdict = "DEDUPED BY HREF — no duplicates across a healthy link set"
    }
  }

  if (!verdict) {
    for (const c of campaigns.slice(0, 10)) {
      const actions = await listCampaignActions(c.id)
      for (const a of actions.filter((x) => x.type === "email" || x.body).slice(0, 2)) {
        const links = await campaignActionLinks(c.id, a.id, true)
        if (links.length < 2) continue
        const hrefs = links.map((l) => l.link?.href).filter(Boolean) as string[]
        const dupes = hrefs.filter((h, i) => hrefs.indexOf(h) !== i)
        console.log(`campaign ${c.id} action ${a.id}: ${links.length} links, ${new Set(hrefs).size} distinct`)
        if (dupes.length) {
          verdict = "PER-ANCHOR — duplicate hrefs carry distinct link ids; clicks are separable"
          break
        }
        verdict = "DEDUPED BY HREF — no duplicates across a healthy link set"
      }
      if (verdict?.startsWith("PER-ANCHOR")) break
    }
  }

  console.log(`\n  ANSWER: ${verdict ?? "INCONCLUSIVE — no email had 2+ tracked links"}`)

  heading("Sample: newsletter content shape")

  const withContent = newsletters.slice(0, 5)
  for (const n of withContent) {
    const contents = await getNewsletterContents(n.id)
    if (!contents.length) continue
    console.log(`newsletter ${n.id} "${n.name}": ${contents.length} variant(s)`)
    const v = contents[0]
    console.log(`  subject: ${preview(v.subject, 80)}`)
    console.log(`  layout present: ${Boolean(v.layout)}  body present: ${Boolean(v.body)}`)
    console.log(`  layout has {{ content }} slot: ${/\{\{\s*content\s*\}\}/.test(v.layout ?? "")}`)
    break
  }

  console.log("\nProbe complete — read-only, nothing was modified.\n")
}

main().catch((err) => {
  console.error("\nProbe failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
