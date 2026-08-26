/**
 * The heatmap's color scale.
 *
 * Sequential encoding — one hue, light→dark — per the dataviz method. Blue is the
 * default sequential hue; steps are the validated 100→700 blue ramp.
 *
 * Two decisions specific to overlaying a live email:
 *
 *   1. **The ramp is anchored to the email's canvas, not the site theme.** An
 *      email is its own document and is almost always a light one, so the ramp
 *      stays light→dark even when the surrounding site is in dark mode. Flipping
 *      it would key the scale to a background it isn't actually sitting on.
 *
 *   2. **Any link with at least one click floors at step 150.** Pure
 *      share-of-max would render a link with 6% of the clicks as near-invisible,
 *      which reads as "never clicked" — a different claim entirely. Ordering is
 *      still truthful (a hotter link is always a darker step); the floor only
 *      guarantees that a real click is never rendered as no click.
 *
 * Color is never the only channel: every hotspot also carries a rank badge and an
 * exact count, and the link table is the table view the accessibility pass wants.
 */

/** Validated blue sequential ramp, light → dark. */
const BLUE_RAMP = [
  "#cde2fb", // 100
  "#b7d3f6", // 150
  "#9ec5f4", // 200
  "#86b6ef", // 250
  "#6da7ec", // 300
  "#5598e7", // 350
  "#3987e5", // 400
  "#2a78d6", // 450
  "#256abf", // 500
  "#1c5cab", // 550
  "#184f95", // 600
  "#104281", // 650
  "#0d366b", // 700
] as const

/** Index of step 150 — the floor for any link that was clicked at all. */
const CLICKED_FLOOR_INDEX = 1

/**
 * Ramp for links sitting on a dark background.
 *
 * The dataviz method says a sequential ramp "flips anchor in dark" — the steps
 * nearest the surface are the ones that recede. An email is not uniformly light
 * or dark, though: a dark hero block sits directly above white body copy. So the
 * flip is decided per link, from the background actually behind it, rather than
 * once for the whole document. Without this, the hottest link in an email —
 * typically the CTA on a dark brand-colored block — renders as the least visible
 * thing on the page.
 */
const BLUE_RAMP_ON_DARK = [...BLUE_RAMP].reverse()

/** Status `warning`, for links whose clicks can't be attributed. Never used alone. */
export const UNATTRIBUTED_COLOR = "#fab219"

export type HeatState =
  /** Matched, with clicks. */
  | "hot"
  /** Matched, tracked, zero clicks. */
  | "cold"
  /** Href contains Liquid — destination decided at send time. */
  | "templated"
  /** Matched more than one tracked link, or none. */
  | "unattributed"
  /** mailto:/tel:/anchor — no tracker could record it. Not a problem. */
  | "untrackable"
  /** `{% cio_link ... track:false %}` — tracking switched off deliberately. */
  | "tracking-off"

export interface HeatStyle {
  state: HeatState
  /** Fill color, already alpha-composited for overlay use. */
  fill: string
  /** Solid outline so the link's bounds read on any background. */
  stroke: string
  /** 0–1 share of this email's busiest link. */
  share: number
}

/**
 * Style one link's overlay.
 *
 * `clicks` and `maxClicks` are at whatever basis the viewer has selected; the
 * scale is always relative to the busiest link in the same email, so emails with
 * wildly different send volumes stay comparable within themselves.
 */
export function heatStyle(
  clicks: number,
  maxClicks: number,
  state: HeatState,
  onDark = false,
): HeatStyle {
  if (state === "untrackable" || state === "tracking-off") {
    // Deliberately the quietest treatment: outlined, uncolored, no warning hue.
    // These links are fine; they simply aren't measurable.
    return {
      state,
      fill: "transparent",
      stroke: "rgba(11,11,11,0.16)",
      share: 0,
    }
  }

  if (state === "templated" || state === "unattributed") {
    return {
      state,
      // Low alpha: these mark uncertainty, so they must not compete visually
      // with real click data.
      fill: hexToRgba(UNATTRIBUTED_COLOR, 0.18),
      stroke: UNATTRIBUTED_COLOR,
      share: 0,
    }
  }

  if (clicks <= 0 || maxClicks <= 0) {
    return {
      state: "cold",
      fill: "transparent",
      // A visible but unfilled outline: tracked, measured, genuinely zero.
      stroke: onDark ? "rgba(255,255,255,0.34)" : "rgba(11,11,11,0.28)",
      share: 0,
    }
  }

  const share = Math.min(1, clicks / maxClicks)
  const ramp = onDark ? BLUE_RAMP_ON_DARK : BLUE_RAMP
  const span = ramp.length - 1 - CLICKED_FLOOR_INDEX
  const index = CLICKED_FLOOR_INDEX + Math.round(share * span)
  const hex = ramp[index]

  // Alpha rises with intensity but caps below opaque — the email's own content
  // has to stay readable through its own heatmap. Dark backgrounds need a little
  // more of it, since a translucent light wash loses more to the ground beneath.
  const alpha = (onDark ? 0.38 : 0.3) + share * 0.28

  return { state: "hot", fill: hexToRgba(hex, alpha), stroke: hex, share }
}

/**
 * Relative luminance of a CSS color string, or null if it isn't parseable /
 * is fully transparent. Used to pick the ramp anchor per link.
 */
export function luminanceOf(color: string): number | null {
  const match = color.match(/rgba?\(([^)]+)\)/)
  if (!match) return null
  const parts = match[1].split(",").map((v) => parseFloat(v.trim()))
  const [r, g, b, a = 1] = parts
  if (![r, g, b].every((v) => Number.isFinite(v))) return null
  if (a === 0) return null
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Below this, treat the ground as dark and flip the ramp. */
export const DARK_GROUND_THRESHOLD = 0.3

/** Ramp stops for the legend gradient. */
export function legendStops(): string[] {
  return [...BLUE_RAMP]
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
