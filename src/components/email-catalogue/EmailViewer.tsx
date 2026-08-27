"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { EmailFrame } from "./EmailFrame"
import { HeatLegend } from "./HeatLegend"
import { LinkTable } from "./LinkTable"
import { composeEmailHtml } from "@/lib/catalogue/render"
import type { MatchReport } from "@/lib/catalogue/match"
import {
  DEFAULT_BASIS,
  SURFACE_LABELS,
  clicksFor,
  type CatalogueEmail,
  type ClickBasis,
} from "@/lib/catalogue/types"

type Report = MatchReport & { hiddenSpots: number }

export function EmailViewer({ email }: { email: CatalogueEmail }) {
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [highlightLiquid, setHighlightLiquid] = useState(true)
  const [basis, setBasis] = useState<ClickBasis>(DEFAULT_BASIS)
  const [report, setReport] = useState<Report | null>(null)

  const html = useMemo(
    () => composeEmailHtml({ layout: email.layout, body: email.body }),
    [email.layout, email.body],
  )

  const maxClicks = useMemo(
    () => Math.max(0, ...email.links.map((l) => clicksFor(l, basis))),
    [email.links, basis],
  )

  // Identity of this callback matters — EmailFrame depends on it.
  const handleReport = useCallback((next: Report) => setReport(next), [])

  const templatedCount = report?.anchors.filter((a) => a.templated).length ?? 0
  // Untrackable links (mailto:, tel:, #anchors) and links with tracking switched
  // off on purpose are excluded: having no click data is their normal state, not
  // a gap worth warning about.
  // An unmatched anchor is only a genuine gap when Customer.io returned no link
  // data for this email at all. Otherwise its omission means zero clicks — see
  // the note in EmailFrame — and warning about it would flag every unclicked
  // link in the archive as a problem.
  const hasLinkData = email.links.length > 0
  const unmatchedAnchors = hasLinkData
    ? 0
    : (report?.anchors.filter(
        (a) => !a.templated && !a.untrackable && !a.trackingDisabled && a.linkIndex == null,
      ).length ?? 0)
  const trackingOffCount = report?.anchors.filter((a) => a.trackingDisabled).length ?? 0
  const ambiguousCount = report?.anchors.filter((a) => a.ambiguous).length ?? 0
  // Links whose destination is shared by more than one anchor. Both get tinted
  // with the same rank and count, which without a note reads as two separate
  // links that each earned it.
  const sharedDestinations = report
    ? Array.from(report.anchorsPerLink.values()).filter((n) => n > 1).length
    : 0

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/email-catalogue"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All emails
      </Link>

      <header className="mb-6 mt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border bg-card px-2 py-0.5">
            {SURFACE_LABELS[email.surface]}
          </span>
          {email.parentName && <span>{email.parentName}</span>}
          {email.variantName && <span>· variant {email.variantName}</span>}
          {email.created && <span>· {new Date(email.created * 1000).toLocaleDateString()}</span>}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {email.subject || email.name}
        </h1>
        {email.subject && email.name !== email.subject && (
          <p className="mt-1 text-sm text-muted-foreground">{email.name}</p>
        )}
        {email.preheader && (
          <p className="mt-1 text-sm italic text-muted-foreground">{email.preheader}</p>
        )}
      </header>

      <MetricRow email={email} />

      {/* Controls in one row above the render, per the interaction spec. */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
        <Toggle checked={showHeatmap} onChange={setShowHeatmap} label="Click heatmap" />
        <Toggle checked={highlightLiquid} onChange={setHighlightLiquid} label="Highlight Liquid tags" />

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Basis</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={`${basis.dedupe}-${basis.audience}`}
            onChange={(e) => {
              const [dedupe, audience] = e.target.value.split("-") as ["unique" | "raw", "human" | "all"]
              setBasis({ dedupe, audience })
            }}
          >
            <option value="unique-human">Unique human clicks</option>
            <option value="unique-all">All clicks, deduped</option>
            <option value="raw-all">Raw total clicks</option>
            <option value="raw-human">Raw human clicks</option>
          </select>
        </label>
      </div>

      {showHeatmap && (
        <div className="mt-4">
          <HeatLegend maxClicks={maxClicks} />
        </div>
      )}

      {/* Coverage caveats sit above the render — they change how it should be read. */}
      <Caveats
        email={email}
        templatedCount={templatedCount}
        unmatchedAnchors={unmatchedAnchors}
        ambiguousCount={ambiguousCount}
        unmatchedLinks={report?.unmatchedLinkIndices.length ?? 0}
        hiddenSpots={report?.hiddenSpots ?? 0}
        trackingOffCount={trackingOffCount}
        sharedDestinations={sharedDestinations}
      />

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        {email.hasBody ? (
          <EmailFrame
            html={html}
            links={email.links}
            basis={basis}
            showHeatmap={showHeatmap}
            highlightLiquid={highlightLiquid}
            onReport={handleReport}
          />
        ) : (
          <p className="p-8 text-sm text-muted-foreground">
            {email.bodyMissingReason ?? "No HTML body available for this email."}
          </p>
        )}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Links by clicks</h2>
        <LinkTable
          links={email.links}
          basis={basis}
          anchorsPerLink={report?.anchorsPerLink}
          unmatchedLinkIndices={report?.unmatchedLinkIndices}
        />
      </section>
    </div>
  )
}

function MetricRow({ email }: { email: CatalogueEmail }) {
  const m = email.metrics
  if (m.unavailable) {
    return (
      <p className="text-sm text-muted-foreground">
        Customer.io returned no delivery metrics for this email.
      </p>
    )
  }
  const rate = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—")
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      <Stat label="Sent" value={m.sent.toLocaleString()} />
      <Stat label="Delivered" value={m.delivered.toLocaleString()} />
      <Stat label="Opened" value={m.opened.toLocaleString()} hint={rate(m.opened, m.delivered)} />
      <Stat label="Clicked" value={m.clicked.toLocaleString()} hint={rate(m.clicked, m.delivered)} />
      <Stat label="Tracked links" value={String(email.linkCount)} />
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">
        {value}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </div>
    </div>
  )
}

/**
 * Everything that limits how far the heatmap can be trusted, stated up front.
 *
 * A heatmap invites the reader to believe every link's number is knowable. Where
 * that isn't true, saying so is the difference between a useful tool and a
 * confidently wrong one.
 */
function Caveats({
  email,
  templatedCount,
  unmatchedAnchors,
  ambiguousCount,
  unmatchedLinks,
  hiddenSpots,
  trackingOffCount,
  sharedDestinations,
}: {
  email: CatalogueEmail
  templatedCount: number
  unmatchedAnchors: number
  ambiguousCount: number
  unmatchedLinks: number
  hiddenSpots: number
  trackingOffCount: number
  sharedDestinations: number
}) {
  const notes: string[] = []

  if (email.linksAggregatedAcrossVariants) {
    notes.push(
      "Click counts cover every A/B variant of this newsletter, not just this one — Customer.io had no variant-level link data.",
    )
  }
  if (sharedDestinations) {
    notes.push(
      sharedDestinations === 1
        ? "2 or more links point at the same destination. Customer.io reports one number for that URL, so it's shown on each of them and cannot be split between them."
        : `${sharedDestinations} destinations are each shared by more than one link. Customer.io reports one number per URL, so those counts are shown on every link that shares them and cannot be split.`,
    )
  }
  if (templatedCount) {
    notes.push(
      templatedCount === 1
        ? "1 link builds its URL with Liquid, so its destination was only decided at send time and clicks can't be attributed to it."
        : `${templatedCount} links build their URLs with Liquid, so their destinations were only decided at send time and clicks can't be attributed to them.`,
    )
  }
  if (ambiguousCount) {
    notes.push(
      ambiguousCount === 1
        ? "1 link matched more than one tracked URL; rather than guess, it's left unattributed."
        : `${ambiguousCount} links matched more than one tracked URL each; rather than guess, they're left unattributed.`,
    )
  }
  if (unmatchedAnchors - ambiguousCount > 0) {
    notes.push(
      "Customer.io returned no link-click data for this email at all, so no link can be attributed. Link tracking may be switched off for this message.",
    )
  }
  if (unmatchedLinks) {
    notes.push(
      unmatchedLinks === 1
        ? "1 tracked link couldn't be located in this HTML — the email may have been edited since those clicks were recorded."
        : `${unmatchedLinks} tracked links couldn't be located in this HTML — the email may have been edited since those clicks were recorded.`,
    )
  }
  if (trackingOffCount) {
    notes.push(
      trackingOffCount === 1
        ? "1 link has tracking switched off in its cio_link tag, so it has no click data by design."
        : `${trackingOffCount} links have tracking switched off in their cio_link tags, so they have no click data by design.`,
    )
  }
  if (hiddenSpots) {
    notes.push(
      hiddenSpots === 1
        ? "1 link occupies no visible area (a hidden or preheader link), so it can't be drawn."
        : `${hiddenSpots} links occupy no visible area (hidden or preheader links), so they can't be drawn.`,
    )
  }

  if (!notes.length) return null

  return (
    <div className="mt-4 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
        <TriangleAlert className="h-4 w-4" />
        How to read this heatmap
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {notes.map((note, i) => (
          <li key={i}>{note}</li>
        ))}
      </ul>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
