/**
 * Reading the snapshot from disk.
 *
 * Server-only: uses node:fs so the site needs no API calls and no database at
 * request time. Paths are resolved from the repo root, which is also why
 * next.config.ts declares `data/**` in `outputFileTracingIncludes` — otherwise
 * the snapshot wouldn't ship with the deployment.
 */

import { readFile } from "node:fs/promises"
import path from "node:path"
import type { CatalogueEmail, CatalogueIndex } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")

export const EMPTY_INDEX: CatalogueIndex = {
  generatedAt: "",
  stats: { total: 0, bySurface: {}, withoutBody: 0, skippedUnsent: 0 },
  emails: [],
}

/**
 * Load the index, or an empty one if the ingest hasn't run.
 *
 * A missing snapshot is an expected first-run state, not an error — the index
 * page renders a "run the ingest" prompt instead of crashing.
 */
export async function readIndex(): Promise<CatalogueIndex> {
  try {
    const raw = await readFile(path.join(DATA_DIR, "index.json"), "utf8")
    return JSON.parse(raw) as CatalogueIndex
  } catch (err) {
    if (isMissing(err)) return EMPTY_INDEX
    throw err
  }
}

/** Load one email's full record, or null if it isn't in the snapshot. */
export async function readEmail(id: string): Promise<CatalogueEmail | null> {
  // `id` reaches us from a URL segment, so it must never be trusted to stay
  // inside the data directory on its own.
  if (!/^[a-z0-9-]+$/i.test(id)) return null
  try {
    const raw = await readFile(path.join(DATA_DIR, "emails", `${id}.json`), "utf8")
    return JSON.parse(raw) as CatalogueEmail
  } catch (err) {
    if (isMissing(err)) return null
    throw err
  }
}

function isMissing(err: unknown): boolean {
  return (err as { code?: string })?.code === "ENOENT"
}
