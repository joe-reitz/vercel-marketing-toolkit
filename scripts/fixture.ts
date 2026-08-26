/**
 * Generate a synthetic snapshot for local development and verification.
 *
 * The catalogue can't be exercised without Customer.io credentials, and the
 * pieces most likely to be wrong — the heatmap overlay, the URL matcher, the
 * caveat surfacing — are exactly the pieces that need looking at before a real
 * ingest runs. This builds a snapshot that deliberately includes every awkward
 * case:
 *
 *   - a hero image and CTA button sharing one destination (inseparable clicks)
 *   - a Liquid-templated href (unattributable)
 *   - a tracked link that no longer appears in the HTML (edited since sending)
 *   - an anchor with no tracking at all
 *   - a tracked link with genuinely zero clicks
 *   - a hidden preheader link with no visible area
 *   - UTM drift between the HTML and the reported href (exercises tier 2)
 *   - a `{% cio_link %}` tag, whose destination must still be matched
 *   - a `{% cio_link ... track:false %}` tag, which must read as deliberate
 *
 * Usage: npx tsx scripts/fixture.ts
 */

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { extractSearchText, composeEmailHtml } from "../src/lib/catalogue/render"
import type { CatalogueEmail, CatalogueIndex, CatalogueLink } from "../src/lib/catalogue/types"

const DATA_DIR = path.join(process.cwd(), "data")

function link(href: string, human: number, machine = 0): CatalogueLink {
  return {
    cioLinkId: Math.abs(hash(href)) % 100000,
    href,
    unique: { all: human + machine, human, machine },
    raw: {
      all: Math.round((human + machine) * 1.35),
      human: Math.round(human * 1.3),
      machine: Math.round(machine * 1.6),
    },
  }
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return h
}

const LAYOUT = `<!doctype html>
<html>
<head><meta charset="utf-8"><style>
  body { margin:0; padding:0; background:#f4f4f2; font-family: -apple-system, system-ui, sans-serif; }
  .wrap { max-width:600px; margin:0 auto; background:#ffffff; }
  .pad { padding:32px; }
  h1 { font-size:26px; margin:0 0 12px; color:#0b0b0b; }
  p { font-size:15px; line-height:1.6; color:#3a3a38; margin:0 0 16px; }
  .cta { display:inline-block; background:#0b0b0b; color:#fff; text-decoration:none;
         padding:12px 22px; border-radius:6px; font-weight:600; font-size:15px; }
  .hero { display:block; width:100%; height:180px; background:#111; color:#fff;
          text-align:center; line-height:180px; text-decoration:none; font-size:18px; }
  .footer { padding:24px 32px; font-size:12px; color:#8a8a86; border-top:1px solid #eee; }
  .footer a { color:#8a8a86; }
  .links a { color:#2a78d6; }
</style></head>
<body>{{ content }}</body>
</html>`

const BODY = `
<span style="display:none;max-height:0;overflow:hidden">
  Preheader — <a href="https://vercel.com/preheader">hidden link</a>
</span>
<div class="wrap">
  <a class="hero" href="https://vercel.com/ship?utm_source=customerio&utm_campaign=ship-2026">Vercel Ship 2026</a>
  <div class="pad">
    <h1>Ship 2026 registration is open</h1>
    <p>Hi {{ customer.first_name }}, our biggest release event of the year is back.
       Join us on {{ event.date }} for the keynote and hands-on sessions.</p>
    <p><a class="cta" href="https://vercel.com/ship?utm_source=customerio&utm_campaign=ship-2026">Reserve your seat</a></p>
    <p class="links">Meanwhile, catch up on
       <a href="https://vercel.com/blog/ai-gateway?utm_source=email">the AI Gateway launch</a>,
       read <a href="https://vercel.com/docs/functions">the Functions docs</a>,
       or explore <a href="https://vercel.com/{{ customer.plan }}/overview">your plan</a>.</p>
    <p><a href="https://vercel.com/changelog">What shipped last month</a></p>
    <p class="links">Authored with Customer.io's link tag:
       <a href="{% cio_link url:https://vercel.com/docs/deployments %}">deployment docs</a>,
       and one with tracking deliberately off:
       <a href="{% cio_link url:https://vercel.com/account/reset track:false %}">reset your password</a>.</p>
  </div>
  <div class="footer">
    You're receiving this because you have a Vercel account.
    <a href="https://vercel.com/account/notifications">Manage preferences</a> ·
    <a href="mailto:support@vercel.com">Contact support</a>
  </div>
</div>`

/**
 * Reported links. Note the deliberate mismatches against the HTML above:
 * the hero/CTA share one href, the blog link's UTMs differ, /account/notifications
 * has zero clicks, /pricing is tracked but absent from the HTML, and
 * /docs/functions has no tracking entry at all.
 */
const LINKS: CatalogueLink[] = [
  link("https://vercel.com/ship?utm_source=customerio&utm_campaign=ship-2026", 1284, 240),
  link("https://vercel.com/blog/ai-gateway?utm_source=cio&utm_medium=email", 412, 96),
  link("https://vercel.com/changelog", 168, 31),
  link("https://vercel.com/preheader", 4, 1),
  link("https://vercel.com/account/notifications", 0, 0),
  link("https://vercel.com/pricing", 57, 12),
  // Reported against the cio_link tag's destination, not the tag text.
  link("https://vercel.com/docs/deployments", 233, 44),
]

const NOW = Math.floor(new Date("2026-08-20T12:00:00Z").getTime() / 1000)

const EMAILS: CatalogueEmail[] = [
  {
    id: "newsletter-90210",
    surface: "newsletter",
    name: "Ship 2026 — registration open",
    subject: "Ship 2026 registration is open",
    preheader: "Our biggest release event of the year is back",
    from: "hello@vercel.com",
    created: NOW,
    updated: NOW,
    tags: ["event", "ship"],
    cio: { newsletterId: 90210 },
    layout: LAYOUT,
    body: BODY,
    metrics: { sent: 48210, delivered: 47655, opened: 21894, clicked: 1921, bounced: 555, unsubscribed: 63 },
    links: LINKS,
    hasBody: true,
    linkCount: LINKS.length,
    totalClicks: LINKS.reduce((s, l) => s + l.unique.human, 0),
    searchText: extractSearchText(composeEmailHtml({ layout: LAYOUT, body: BODY })),
  },
  {
    id: "campaign-771-4402",
    surface: "campaign",
    name: "Welcome — day 3 — deploy your first project",
    subject: "Deploy your first project in 60 seconds",
    parentName: "Onboarding nurture",
    created: NOW - 86400 * 45,
    updated: NOW - 86400 * 45,
    tags: ["lifecycle"],
    cio: { campaignId: 771, actionId: 4402 },
    layout: LAYOUT,
    body: BODY.replace("Ship 2026 registration is open", "Deploy your first project"),
    metrics: { sent: 12980, delivered: 12844, opened: 7331, clicked: 1204, bounced: 136, unsubscribed: 18 },
    links: LINKS.slice(0, 4),
    hasBody: true,
    linkCount: 4,
    totalClicks: LINKS.slice(0, 4).reduce((s, l) => s + l.unique.human, 0),
    searchText: "onboarding deploy first project",
  },
  {
    id: "transactional-12",
    surface: "transactional",
    name: "Password reset",
    subject: "Reset your Vercel password",
    created: NOW - 86400 * 300,
    updated: NOW - 86400 * 300,
    cio: { transactionalId: 12 },
    metrics: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, unavailable: true },
    links: [],
    hasBody: false,
    bodyMissingReason: "Customer.io returned no HTML body for this message.",
    linkCount: 0,
    totalClicks: 0,
  },
]

async function main() {
  await mkdir(path.join(DATA_DIR, "emails"), { recursive: true })
  for (const email of EMAILS) {
    await writeFile(path.join(DATA_DIR, "emails", `${email.id}.json`), JSON.stringify(email, null, 2))
  }

  const bySurface: Record<string, number> = {}
  for (const e of EMAILS) bySurface[e.surface] = (bySurface[e.surface] ?? 0) + 1

  const index: CatalogueIndex = {
    generatedAt: new Date("2026-08-26T09:00:00Z").toISOString(),
    isFixture: true,
    stats: { total: EMAILS.length, bySurface, withoutBody: 1, skippedUnsent: 0 },
    emails: EMAILS.map((e) => ({
      id: e.id,
      surface: e.surface,
      name: e.name,
      subject: e.subject,
      parentName: e.parentName,
      variantName: e.variantName,
      created: e.created,
      updated: e.updated,
      tags: e.tags,
      metrics: e.metrics,
      linkCount: e.linkCount,
      totalClicks: e.totalClicks,
      hasBody: e.hasBody,
    })),
  }
  await writeFile(path.join(DATA_DIR, "index.json"), JSON.stringify(index, null, 2))

  console.log(`Wrote fixture snapshot: ${EMAILS.length} emails`)
  console.log("This is synthetic data — run `npm run ingest` for the real archive.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
