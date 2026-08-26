"use client"

import { legendStops, UNATTRIBUTED_COLOR } from "@/lib/catalogue/heat"

/**
 * The sequential ramp legend, plus the three non-magnitude states.
 *
 * The special states are spelled out rather than left to be inferred: a link with
 * no tint could otherwise mean "nobody clicked", "we couldn't match it", or "its
 * destination was Liquid", and those are very different claims.
 */
export function HeatLegend({ maxClicks }: { maxClicks: number }) {
  const gradient = `linear-gradient(to right, ${legendStops().join(", ")})`

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Clicks</span>
        <span className="h-2.5 w-32 rounded-sm border border-border" style={{ background: gradient }} />
        <span className="tabular-nums">0</span>
        <span aria-hidden>→</span>
        <span className="tabular-nums">{maxClicks.toLocaleString()}</span>
      </div>

      {/*
        Border token, not the spot's own stroke: the legend sits on toolkit
        chrome, which follows the site theme, while a real spot sits on the
        email's own background. A hardcoded dark stroke would vanish in dark mode.
      */}
      <Swatch label="Tracked, zero clicks" className="border-dotted border-border" />
      <Swatch label="Not trackable (mailto, tel, anchor)" className="border-solid border-border" />

      {/*
        Liquid, no-match, and ambiguous share one treatment because they share one
        meaning: a number we decline to claim. Listing them separately with
        identical swatches only implied a distinction the colors don't make.
      */}
      <Swatch
        label="Not attributable — Liquid, no match, or ambiguous"
        icon="⚠"
        className="border-dashed"
        style={{ background: "rgba(250, 178, 25, 0.18)", borderColor: UNATTRIBUTED_COLOR }}
      />

      <span className="flex items-center gap-1.5">
        <span className="heat-rank" style={{ position: "static" }}>
          1
        </span>
        Rank by clicks
      </span>
    </div>
  )
}

function Swatch({
  label,
  className = "",
  style,
  icon,
}: {
  label: string
  className?: string
  style?: React.CSSProperties
  icon?: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3.5 w-6 rounded-sm border-2 ${className}`} style={style} />
      {/* Status color never carries meaning alone — icon plus label. */}
      {icon && <span aria-hidden>{icon}</span>}
      {label}
    </span>
  )
}
