"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"
import { EmailThumb } from "./EmailThumb"
import {
  SURFACE_LABELS,
  type CatalogueIndex,
  type CatalogueIndexEntry,
  type EmailSurface,
} from "@/lib/catalogue/types"

type SortKey = "recent" | "clicks" | "sent" | "ctr"

const SURFACES: EmailSurface[] = ["newsletter", "campaign", "broadcast", "transactional"]

export function CatalogueBrowser({ index }: { index: CatalogueIndex }) {
  const [query, setQuery] = useState("")
  const [surfaces, setSurfaces] = useState<Set<EmailSurface>>(new Set(SURFACES))
  const [sort, setSort] = useState<SortKey>("recent")

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = index.emails.filter((e) => {
      if (!surfaces.has(e.surface)) return false
      if (!needle) return true
      return (
        e.name.toLowerCase().includes(needle) ||
        (e.subject ?? "").toLowerCase().includes(needle) ||
        (e.parentName ?? "").toLowerCase().includes(needle) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(needle))
      )
    })
    return sortEntries(filtered, sort)
  }, [index.emails, query, surfaces, sort])

  const toggleSurface = (surface: EmailSurface) => {
    const next = new Set(surfaces)
    if (next.has(surface)) next.delete(surface)
    else next.add(surface)
    // Never filter down to nothing — an empty grid reads as a broken page.
    if (next.size) setSurfaces(next)
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {index.isFixture && (
        <div className="mb-5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <TriangleAlert className="h-4 w-4" />
            Synthetic sample data.
          </span>{" "}
          <span className="text-muted-foreground">
            Every number and email on this page came from <code>scripts/fixture.ts</code>, not from
            Customer.io. Run <code>npm run catalogue:ingest</code> to replace it with the real archive.
          </span>
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Email Catalogue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {index.stats.total.toLocaleString()} emails sent out of Customer.io
          {index.generatedAt && ` · snapshot ${new Date(index.generatedAt).toLocaleString()}`}
        </p>
      </header>

      {/* Filters in one row above the content. */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder="Search subject, name, or tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        />

        <div className="flex flex-wrap gap-1.5">
          {SURFACES.map((surface) => {
            const active = surfaces.has(surface)
            const count = index.stats.bySurface[surface] ?? 0
            return (
              <button
                key={surface}
                onClick={() => toggleSurface(surface)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {SURFACE_LABELS[surface]}{" "}
                {count > 0 && <span className="tabular-nums">({count})</span>}
              </button>
            )
          })}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="recent">Most recent</option>
            <option value="clicks">Most clicks</option>
            <option value="sent">Most sent</option>
            <option value="ctr">Highest click rate</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emails match those filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((email) => (
            <Card key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ email }: { email: CatalogueIndexEntry }) {
  const ctr = email.metrics.delivered > 0 ? (email.metrics.clicked / email.metrics.delivered) * 100 : null

  return (
    <Link
      href={`/email-catalogue/${email.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-foreground/20 hover:shadow-lg"
    >
      {email.hasBody ? (
        <EmailThumb id={email.id} />
      ) : (
        <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: 200 }}>
          No HTML body
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 border-t border-border p-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{SURFACE_LABELS[email.surface]}</span>
          {email.created && <span>· {new Date(email.created * 1000).toLocaleDateString()}</span>}
        </div>

        <div className="line-clamp-2 text-sm font-medium leading-snug">
          {email.subject || email.name}
        </div>

        {email.parentName && (
          <div className="line-clamp-1 text-xs text-muted-foreground">
            {email.parentName}
            {email.variantName && ` · ${email.variantName}`}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>{email.metrics.sent.toLocaleString()} sent</span>
          <span>{email.totalClicks.toLocaleString()} clicks</span>
          {ctr != null && <span>{ctr.toFixed(1)}% CTR</span>}
          <span>
            {email.linkCount} link{email.linkCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </Link>
  )
}

function sortEntries(entries: CatalogueIndexEntry[], sort: SortKey): CatalogueIndexEntry[] {
  const copy = [...entries]
  switch (sort) {
    case "clicks":
      return copy.sort((a, b) => b.totalClicks - a.totalClicks)
    case "sent":
      return copy.sort((a, b) => b.metrics.sent - a.metrics.sent)
    case "ctr":
      return copy.sort((a, b) => ctrOf(b) - ctrOf(a))
    default:
      return copy.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  }
}

function ctrOf(entry: CatalogueIndexEntry): number {
  return entry.metrics.delivered > 0 ? entry.metrics.clicked / entry.metrics.delivered : 0
}
