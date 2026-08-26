"use client"

import { useEffect, useRef, useState } from "react"
import { composeEmailHtml } from "@/lib/catalogue/render"

/**
 * A real, scaled-down rendering of the email for index cards.
 *
 * Deliberately not a screenshot pipeline: the email is rendered in a full-width
 * iframe and CSS-scaled down, so there's no image generation step, nothing to
 * regenerate when an email changes, and no blurry raster at high DPI.
 *
 * HTML is fetched only when the card scrolls into view — an archive index may
 * hold thousands of emails, and loading every body up front would be pointless.
 */

const FRAME_WIDTH = 640

export function EmailThumb({ id, height = 200 }: { id: string; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  // Measured, not read from the ref during render: a ref read during render sees
  // whatever the previous commit left behind, so the scale was only ever correct
  // by accident of a later re-render — and never recovered on resize.
  const [width, setWidth] = useState(FRAME_WIDTH)

  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "300px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Track the card's own width so the scale stays correct through layout changes.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const apply = () => setWidth(node.clientWidth || FRAME_WIDTH)
    apply()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", apply)
      return () => window.removeEventListener("resize", apply)
    }
    const observer = new ResizeObserver(apply)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || html || failed) return
    let cancelled = false
    fetch(`/api/email-catalogue/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { layout?: string; body?: string }) => {
        if (!cancelled) setHtml(composeEmailHtml({ layout: data.layout, body: data.body }))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [visible, id, html, failed])

  const scale = width / FRAME_WIDTH

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ height, background: "#ffffff" }}
    >
      {html ? (
        <iframe
          title=""
          aria-hidden
          srcDoc={html}
          // Same isolation as the full viewer: no allow-scripts, so nothing in
          // the email runs. Thumbnails need no measurement, so no same-origin.
          sandbox=""
          scrolling="no"
          style={{
            width: FRAME_WIDTH,
            height: height / scale,
            border: "none",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-card text-xs text-muted-foreground">
          {failed ? "Preview unavailable" : ""}
        </div>
      )}
    </div>
  )
}
