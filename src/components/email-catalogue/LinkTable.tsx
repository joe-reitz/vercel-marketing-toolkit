"use client"

import { clicksFor, type CatalogueLink, type ClickBasis } from "@/lib/catalogue/types"

/**
 * The table view of the same data the heatmap encodes.
 *
 * Required by the accessibility pass — identity and magnitude must be available
 * without relying on color — and it's also just the fastest way to read the
 * ranking. Machine clicks get their own column so the gap between "people" and
 * "scanners" is visible rather than buried in a toggle.
 */
export function LinkTable({
  links,
  basis,
  anchorsPerLink,
  unmatchedLinkIndices,
}: {
  links: CatalogueLink[]
  basis: ClickBasis
  anchorsPerLink?: Map<number, number>
  unmatchedLinkIndices?: number[]
}) {
  if (!links.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Customer.io reported no tracked links for this email.
      </p>
    )
  }

  const unmatched = new Set(unmatchedLinkIndices ?? [])
  const rows = links
    .map((link, index) => ({ link, index, clicks: clicksFor(link, basis) }))
    .sort((a, b) => b.clicks - a.clicks)
  const total = rows.reduce((sum, r) => sum + r.clicks, 0)

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-card text-left text-muted-foreground">
            <th scope="col" className="w-10 px-3 py-2 font-medium">#</th>
            <th scope="col" className="px-3 py-2 font-medium">Destination</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Clicks</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Share</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Machine</th>
            <th scope="col" className="px-3 py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ link, index, clicks }, position) => {
            const shared = (anchorsPerLink?.get(index) ?? 0) > 1
            const share = total > 0 ? (clicks / total) * 100 : 0
            const machine = basis.dedupe === "unique" ? link.unique.machine : link.raw.machine
            return (
              <tr key={index} className="border-t border-border">
                <td className="px-3 py-2 align-top tabular-nums text-muted-foreground">
                  {clicks > 0 ? position + 1 : "—"}
                </td>
                <td className="px-3 py-2 align-top">
                  <span className="break-all">{link.href}</span>
                </td>
                <td className="px-3 py-2 text-right align-top tabular-nums">
                  {clicks.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right align-top tabular-nums text-muted-foreground">
                  {share.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right align-top tabular-nums text-muted-foreground">
                  {machine.toLocaleString()}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  <span className="flex flex-col gap-0.5">
                    {shared && (
                      <span>
                        ⚠ Shared by {anchorsPerLink?.get(index)} links in the email — clicks are not
                        separable between them.
                      </span>
                    )}
                    {unmatched.has(index) && (
                      <span>⚠ Tracked by Customer.io but not found in this HTML.</span>
                    )}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
