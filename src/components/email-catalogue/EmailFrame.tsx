"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { matchAnchors, type AnchorMatch, type MatchReport } from "@/lib/catalogue/match"
import {
  DARK_GROUND_THRESHOLD,
  glowDiameter,
  glowGradient,
  luminanceOf,
  type HeatState,
} from "@/lib/catalogue/heat"
import { clicksFor, type CatalogueLink, type ClickBasis } from "@/lib/catalogue/types"

/**
 * Renders an email's HTML and overlays per-link click intensity.
 *
 * Isolation: the email goes into an iframe with `sandbox="allow-same-origin"` and
 * deliberately WITHOUT `allow-scripts`. That combination means nothing inside the
 * email can execute, while the parent can still read the document to measure
 * where each link sits. Dropping `allow-same-origin` would block measurement;
 * adding `allow-scripts` alongside it would defeat the sandbox entirely.
 *
 * Geometry: the iframe is grown to its full content height so it never scrolls
 * internally. That keeps `getBoundingClientRect()` in the same coordinate space
 * as the absolutely-positioned overlay, which is what lets the tints stay glued
 * to their links through resizes and reflows.
 */

export interface HeatSpot {
  rect: { top: number; left: number; width: number; height: number }
  match: AnchorMatch
  /** 1-based rank by clicks; null when there's nothing to rank. */
  rank: number | null
  clicks: number
  state: HeatState
  /** False for the continuation boxes of a link that wraps across lines. */
  isPrimaryRect: boolean
  /** Ground behind this link is dark, so the ramp anchor flips. */
  onDark: boolean
  /** Share of the busiest link's clicks, 0–1. Drives glow size and colour. */
  share: number
  /** Absolute http(s) destination, or null when it isn't navigable. */
  destination: string | null
}

interface Props {
  html: string
  links: CatalogueLink[]
  basis: ClickBasis
  showHeatmap: boolean
  highlightLiquid: boolean
  /** Reports match results upward so the page can show coverage warnings. */
  onReport?: (report: MatchReport & { hiddenSpots: number }) => void
}

/**
 * The effective background behind an element.
 *
 * CSS backgrounds are transparent by default, so the visible ground is whichever
 * ancestor first paints one — walk up until something does. Falls back to light,
 * since an email with no declared background renders on white.
 */
function groundIsDark(el: Element, win: Window): boolean {
  let node: Element | null = el
  for (let depth = 0; node && depth < 12; depth++) {
    const bg = win.getComputedStyle(node).backgroundColor
    const lum = luminanceOf(bg)
    if (lum != null) return lum < DARK_GROUND_THRESHOLD
    node = node.parentElement
  }
  return false
}

export function EmailFrame({ html, links, basis, showHeatmap, highlightLiquid, onReport }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [spots, setSpots] = useState<HeatSpot[]>([])
  const [hovered, setHovered] = useState<number | null>(null)
  const [height, setHeight] = useState(600)

  // Ranks and the busiest link are per-email, so a hot link in a small send
  // still reads as hot.
  const clickValues = links.map((l) => clicksFor(l, basis))
  const maxClicks = Math.max(0, ...clickValues)
  const rankByIndex = new Map<number, number>()
  links
    .map((_, i) => i)
    .filter((i) => clickValues[i] > 0)
    .sort((a, b) => clickValues[b] - clickValues[a])
    .forEach((linkIndex, position) => rankByIndex.set(linkIndex, position + 1))

  const measure = useCallback(() => {
    const frame = frameRef.current
    const doc = frame?.contentDocument
    const win = frame?.contentWindow
    if (!frame || !doc || !win || !doc.body) return

    // Grow to content height so the frame never scrolls on its own.
    const contentHeight = Math.max(
      doc.documentElement?.scrollHeight ?? 0,
      doc.body.scrollHeight,
      doc.body.offsetHeight,
    )
    if (contentHeight > 0) setHeight(contentHeight)

    const anchors = Array.from(doc.querySelectorAll("a[href]"))
    // getAttribute, not `.href`: we need the href as authored, with any Liquid
    // still intact. `.href` would resolve and encode it.
    const hrefs = anchors.map((a) => a.getAttribute("href") ?? "")
    const report = matchAnchors(hrefs, links)

    let hiddenSpots = 0
    const next: HeatSpot[] = []

    anchors.forEach((anchor, i) => {
      const match = report.anchors[i]

      // getClientRects, not getBoundingClientRect: a text link that wraps across
      // lines gets one box per line. The bounding box would be their union, which
      // covers text the link doesn't occupy — tinting words nobody could click.
      const rects = Array.from(anchor.getClientRects()).filter((r) => r.width >= 1 && r.height >= 1)

      // Zero-area anchors are real links we cannot draw on — preheader text,
      // display:none blocks, links inside collapsed table cells. Counted so the
      // viewer can admit they exist rather than dropping them silently.
      if (!rects.length) {
        hiddenSpots++
        return
      }

      const linkIndex = match.linkIndex
      const clicks = linkIndex != null ? clickValues[linkIndex] : 0

      // Customer.io only reports links that received at least one click —
      // verified across the whole archive: 0 of 976 reported links had zero
      // clicks. So when an email HAS link data, a link Customer.io omitted got
      // no clicks, and "cold" is the accurate reading. Calling that
      // "unattributable" would flag the normal state of every unclicked link in
      // every email as a problem.
      //
      // When an email has NO link data at all, that inference isn't available:
      // tracking may be switched off for the message, so we say so instead of
      // asserting zero.
      const emailHasLinkData = links.length > 0
      const state: HeatState = match.templated
        ? "templated"
        : match.trackingDisabled
          ? "tracking-off"
          : match.untrackable
            ? "untrackable"
            : linkIndex == null
              ? emailHasLinkData && !match.ambiguous
                ? "cold"
                : "unattributed"
              : clicks > 0
                ? "hot"
                : "cold"

      const onDark = groundIsDark(anchor, win)
      const share = maxClicks > 0 ? Math.min(1, clicks / maxClicks) : 0
      // Navigate to the resolved destination — the cio_link tag's url when
      // present, otherwise the href as authored. Liquid and non-web schemes have
      // no fixed target, so those aren't navigable.
      const destination = toNavigable(match.resolvedHref)

      rects.forEach((rect, rectIndex) => {
        next.push({
          rect: {
            top: rect.top + win.scrollY,
            left: rect.left + win.scrollX,
            width: rect.width,
            height: rect.height,
          },
          match,
          rank: linkIndex != null ? (rankByIndex.get(linkIndex) ?? null) : null,
          clicks,
          state,
          isPrimaryRect: rectIndex === 0,
          onDark,
          share,
          destination,
        })
      })
    })

    setSpots(next)
    // Indices change when the document reflows; a stale one would pin a tooltip
    // to the wrong link.
    setHovered(null)
    onReport?.({ ...report, hiddenSpots })
    // rankByIndex/clickValues are derived from links+basis, which are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, basis, onReport])

  /**
   * Wrap Liquid tags in text nodes so they read as chips.
   *
   * Done in the DOM rather than by rewriting the HTML string: Liquid also appears
   * inside attributes (`href="{{ url }}"`), and a regex over the raw markup would
   * happily inject a `<span>` into an attribute value and corrupt the document.
   * Walking text nodes only touches Liquid that's actually visible text.
   */
  const decorateLiquid = useCallback((doc: Document) => {
    const existing = doc.querySelectorAll("[data-liquid-chip]")
    existing.forEach((el) => {
      const parent = el.parentNode
      if (!parent) return
      parent.replaceChild(doc.createTextNode(el.textContent ?? ""), el)
      parent.normalize()
    })
    if (!highlightLiquid) return

    const pattern = /(\{\{[^}]*\}\}|\{%[^%]*%\})/g
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement?.tagName
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TITLE") return NodeFilter.FILTER_REJECT
        return pattern.test(node.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      },
    })

    const targets: Text[] = []
    while (walker.nextNode()) targets.push(walker.currentNode as Text)

    for (const node of targets) {
      const text = node.nodeValue ?? ""
      const fragment = doc.createDocumentFragment()
      let cursor = 0
      for (const m of Array.from(text.matchAll(pattern))) {
        const start = m.index ?? 0
        if (start > cursor) fragment.appendChild(doc.createTextNode(text.slice(cursor, start)))
        const chip = doc.createElement("span")
        chip.setAttribute("data-liquid-chip", "")
        chip.textContent = m[0]
        fragment.appendChild(chip)
        cursor = start + m[0].length
      }
      if (cursor < text.length) fragment.appendChild(doc.createTextNode(text.slice(cursor)))
      node.parentNode?.replaceChild(fragment, node)
    }
  }, [highlightLiquid])

  /** Styles for the chips, injected once into the email document. */
  const injectStyles = useCallback((doc: Document) => {
    if (doc.getElementById("catalogue-chip-style")) return
    const style = doc.createElement("style")
    style.id = "catalogue-chip-style"
    style.textContent = `
      [data-liquid-chip] {
        background: rgba(250, 178, 25, 0.22);
        outline: 1px dashed rgba(180, 120, 0, 0.6);
        border-radius: 3px;
        padding: 0 2px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.92em;
      }
      /* An archive is for reading, not clicking through. */
      a { cursor: default; }
    `
    doc.head?.appendChild(style)
  }, [])

  const handleLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    injectStyles(doc)
    decorateLiquid(doc)
    measure()

    // Images change layout after the load event, so re-measure as they arrive.
    doc.querySelectorAll("img").forEach((img) => {
      if (!(img as HTMLImageElement).complete) {
        img.addEventListener("load", measure, { once: true })
        img.addEventListener("error", measure, { once: true })
      }
    })
  }, [decorateLiquid, injectStyles, measure])

  // Re-decorate when the Liquid toggle flips, without reloading the frame.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc?.body) return
    decorateLiquid(doc)
    measure()
  }, [highlightLiquid, decorateLiquid, measure])

  // Re-rank and re-tint when the click basis changes.
  useEffect(() => {
    measure()
  }, [basis, measure])

  // Track reflow from window resizes and from the email's own content.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    window.addEventListener("resize", measure)
    let observer: ResizeObserver | undefined
    const doc = frame.contentDocument
    if (doc?.documentElement && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure)
      observer.observe(doc.documentElement)
    }
    return () => {
      window.removeEventListener("resize", measure)
      observer?.disconnect()
    }
  }, [measure, html])

  const activeSpot = hovered != null ? spots[hovered] : null

  return (
    <div className="relative" style={{ background: "#ffffff" }}>
      <iframe
        ref={frameRef}
        title="Email rendering"
        srcDoc={html}
        onLoad={handleLoad}
        // No allow-scripts: the email cannot execute. allow-same-origin is what
        // permits measurement of link positions.
        sandbox="allow-same-origin"
        scrolling="no"
        style={{ width: "100%", height, border: "none", display: "block" }}
      />

      {/*
        The overlay is always mounted, even with the heatmap hidden, because it
        owns link clicks and hover tooltips. Hiding it would silently make the
        email's links dead.
      */}
      <div className="heat-layer" data-heatmap={showHeatmap ? "on" : "off"}>
        {showHeatmap &&
          spots.map((spot, i) =>
            spot.state === "hot" ? (
              <div
                key={`glow-${i}`}
                className="heat-glow"
                style={glowBoxStyle(spot)}
                aria-hidden
              />
            ) : null,
          )}

        {spots.map((spot, i) => {
          const flag =
            spot.state === "templated" || spot.state === "unattributed"
              ? "unattributable"
              : spot.destination
                ? undefined
                : "not-navigable"
          const label = describeSpot(spot, maxClicks)
          const shared = {
            className: "heat-hit",
            "data-flag": flag,
            "data-state": spot.state,
            style: {
              top: spot.rect.top,
              left: spot.rect.left,
              width: spot.rect.width,
              height: spot.rect.height,
            },
            onMouseEnter: () => setHovered(i),
            onMouseLeave: () => setHovered((prev) => (prev === i ? null : prev)),
            onFocus: () => setHovered(i),
            onBlur: () => setHovered((prev) => (prev === i ? null : prev)),
            "aria-label": label,
          } as const

          // rel=noopener noreferrer: these are third-party destinations from
          // email content, so the new tab gets no handle on this page.
          return spot.destination ? (
            <a
              key={`hit-${i}`}
              {...shared}
              href={spot.destination}
              target="_blank"
              rel="noopener noreferrer"
            >
              {spot.rank != null && spot.isPrimaryRect && showHeatmap && (
                <span className="heat-rank">{spot.rank}</span>
              )}
            </a>
          ) : (
            <div key={`hit-${i}`} {...shared} tabIndex={0} role="note">
              {spot.rank != null && spot.isPrimaryRect && showHeatmap && (
                <span className="heat-rank">{spot.rank}</span>
              )}
            </div>
          )
        })}

        {activeSpot && <Tooltip spot={activeSpot} maxClicks={maxClicks} />}
      </div>
    </div>
  )
}

/** Centre the glow on the link's box and size it by intensity. */
function glowBoxStyle(spot: HeatSpot): React.CSSProperties {
  const diameter = glowDiameter(spot.rect.width, spot.rect.height, spot.share)
  return {
    top: spot.rect.top + spot.rect.height / 2 - diameter / 2,
    left: spot.rect.left + spot.rect.width / 2 - diameter / 2,
    width: diameter,
    height: diameter,
    background: glowGradient(spot.share),
  }
}

/**
 * Hover tooltip. Leads with the number, because that's what the glow can only
 * approximate.
 */
function Tooltip({ spot, maxClicks }: { spot: HeatSpot; maxClicks: number }) {
  const share = maxClicks > 0 ? Math.round((spot.clicks / maxClicks) * 100) : 0
  const attributable = spot.state === "hot" || spot.state === "cold"

  // Above the link when there's room, below when it would clip off the top.
  const above = spot.rect.top > 78
  const style: React.CSSProperties = {
    left: Math.max(6, spot.rect.left),
    top: above ? spot.rect.top - 10 : spot.rect.top + spot.rect.height + 10,
    transform: above ? "translateY(-100%)" : undefined,
  }

  return (
    <div className="heat-tip" style={style} role="tooltip">
      {attributable ? (
        <>
          <div className="heat-tip-count">
            {spot.clicks.toLocaleString()} {spot.clicks === 1 ? "click" : "clicks"}
          </div>
          <div>
            {spot.rank != null ? `#${spot.rank} in this email · ` : ""}
            {share}% of the busiest link
          </div>
        </>
      ) : (
        <div className="heat-tip-count">No click data</div>
      )}
      <div className="heat-tip-href">{spot.destination ?? spot.match.href}</div>
      {!attributable && <div className="heat-tip-note">{reasonFor(spot)}</div>}
      {spot.destination && <div className="heat-tip-note">Click to open in a new tab</div>}
    </div>
  )
}

function reasonFor(spot: HeatSpot): string {
  switch (spot.state) {
    case "templated":
      return "Built with Liquid, so its destination was only decided at send time."
    case "tracking-off":
      return "Link tracking is switched off for this link."
    case "untrackable":
      return "Not a trackable web link."
    default:
      return "Customer.io has no click data for this link."
  }
}

/** An absolute http(s) URL, or null when the value can't be opened. */
function toNavigable(href: string): string | null {
  if (!href || hasLiquidish(href)) return null
  try {
    const url = new URL(href)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function hasLiquidish(href: string): boolean {
  return /\{\{|\{%/.test(href)
}

/** Hover/screen-reader text. Says plainly when a number isn't knowable. */
function describeSpot(spot: HeatSpot, maxClicks: number): string {
  const share = maxClicks > 0 ? Math.round((spot.clicks / maxClicks) * 100) : 0
  switch (spot.state) {
    case "templated":
      return `${spot.match.href} — destination set at send time by Liquid, so clicks cannot be attributed to this link.`
    case "unattributed":
      return spot.match.ambiguous
        ? `${spot.match.resolvedHref} — matches more than one tracked link, so its clicks cannot be told apart.`
        : `${spot.match.resolvedHref} — no click tracking found for this link.`
    case "tracking-off":
      return `${spot.match.resolvedHref} — link tracking is switched off for this link (track:false), so it has no click data by design.`
    case "untrackable":
      return `${spot.match.href} — not a trackable web link, so it has no click data.`
    case "cold":
      return `${spot.match.resolvedHref} — no clicks. Customer.io reports only links that were clicked, so this one received none.`
    default:
      return `${spot.match.resolvedHref} — ${spot.clicks.toLocaleString()} clicks (${share}% of the busiest link).`
  }
}
