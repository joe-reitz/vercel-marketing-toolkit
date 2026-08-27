/**
 * One catalogued email's full record.
 *
 * Exists so the index page can lazy-load thumbnail HTML as cards scroll into
 * view. Putting every body in index.json would make the index page megabytes;
 * fetching on demand keeps the first paint small while still showing real
 * renderings rather than placeholder boxes.
 */

import { NextResponse } from "next/server"
import { readEmail } from "@/lib/catalogue/snapshot"

export const runtime = "nodejs"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = await readEmail(id)
  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(
    { id: email.id, layout: email.layout, body: email.body },
    // The snapshot only changes when the ingest runs, so this is safe to cache.
    { headers: { "Cache-Control": "public, max-age=3600" } },
  )
}
