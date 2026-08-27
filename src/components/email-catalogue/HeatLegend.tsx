"use client"

import { glowLegendStops, UNATTRIBUTED_COLOR } from "@/lib/catalogue/heat"

/**
 * Legend for the glow heatmap.
 *
 * Two things need saying that the glow alone can't: that no glow means no clicks
 * (rather than an unmeasured link), and that a dashed marker means the clicks
 * exist but can't be attributed. Both are claims a reader would otherwise have to
 * guess at.
 */
export function HeatLegend({ maxClicks }: { maxClicks: number }) {
  const gradient = `linear-gradient(to right, ${glowLegendStops().join(", ")})`

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
        Glow intensity is the only positive signal now, so the absence of one has
        to be stated. Customer.io reports only links that were clicked, so no glow
        means no clicks — not a missing measurement.
      */}
      <span>No glow = no clicks</span>

      {/*
        The one state that still needs a drawn marker: a link whose clicks can't
        be attributed. A glow would imply a number we don't have, and leaving it
        bare would read as "no clicks", which is a different claim.
      */}
      <Swatch
        label="Not attributable"
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
      <span>Hover a link for its exact count · click to open it</span>
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
