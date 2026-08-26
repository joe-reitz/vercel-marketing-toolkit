"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { matchAnchors, type AnchorMatch, type MatchReport } from "@/lib/catalogue/match"
import {
  DARK_GROUND_THRESHOLD,
  heatStyle,
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
      const state: HeatState = match.templated
        ? "templated"
        : match.trackingDisabled
          ? "tracking-off"
          : match.untrackable
            ? "untrackable"
            : linkIndex == null
              ? "unattributed"
              : clicks > 0
                ? "hot"
                : "cold"

      const onDark = groundIsDark(anchor, win)

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
        })
      })
    })

    setSpots(next)
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

      {showHeatmap && (
        <div className="heat-layer" aria-hidden={false}>
          {spots.map((spot, i) => {
            const style = heatStyle(spot.clicks, maxClicks, spot.state, spot.onDark)
            return (
              <div
                key={i}
                className="heat-spot"
                data-state={style.state}
                tabIndex={0}
                aria-label={describeSpot(spot, maxClicks)}
                title={describeSpot(spot, maxClicks)}
                style={{
                  top: spot.rect.top,
                  left: spot.rect.left,
                  width: spot.rect.width,
                  height: spot.rect.height,
                  background: style.fill,
                  borderColor: style.stroke,
                }}
              >
                {spot.rank != null && spot.isPrimaryRect && (
                  <span className="heat-rank">{spot.rank}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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
      return `${spot.match.resolvedHref} — tracked, zero clicks.`
    default:
      return `${spot.match.resolvedHref} — ${spot.clicks.toLocaleString()} clicks (${share}% of the busiest link).`
  }
}
