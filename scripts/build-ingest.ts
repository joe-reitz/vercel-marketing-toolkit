/**
 * Build-time ingest for the email catalogue.
 *
 * Runs before `next build`, so the snapshot is created inside the build
 * container and traced into the deployment output. This is what lets the
 * Customer.io key live in the Vercel project environment and nowhere else — no
 * GitHub Actions secret, no committed snapshot, no local run.
 *
 * Three guards, because a build step that talks to a third-party API must never
 * be the reason a deploy fails:
 *
 *   1. No credential  → skip quietly. Keeps `npm run build` working for anyone
 *      who hasn't configured Customer.io, and for CI that only typechecks.
 *   2. Preview deploy  → skip by default. Otherwise every preview re-ingests the
 *      whole archive, which is slow and burns the shared rate limit for no
 *      benefit. Override with CATALOGUE_INGEST_ON_PREVIEW=true.
 *   3. Ingest throws   → log loudly, exit 0. The build proceeds with whatever
 *      snapshot exists; if none exists the page renders its "no snapshot" state,
 *      which is honest. A Customer.io blip should not block shipping a UI fix.
 *
 * Staleness stays visible either way: the index page shows the snapshot's
 * generatedAt timestamp, so a skipped or failed refresh is legible in the UI
 * rather than silently passing off old numbers as current.
 */

import { config as loadEnv } from "dotenv"
import { existsSync } from "node:fs"

if (existsSync(".env.local")) loadEnv({ path: ".env.local" })
else loadEnv()

const DIM = "\x1b[2m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

/**
 * Informational lines are dim, not yellow.
 *
 * Yellow in a Vercel build log reads as a warning, and these messages are
 * routine — "skipping ingest on a preview deploy" is the guard working, not a
 * problem. Colouring them yellow made a successful build look like a failing
 * one. Yellow is now reserved for `warn`, which only fires when the ingest
 * actually fails.
 */
function note(message: string) {
  console.log(`${DIM}[catalogue]${RESET} ${message}`)
}

function warn(message: string) {
  console.log(`${YELLOW}[catalogue] WARNING${RESET} ${message}`)
}

async function main() {
  if (!process.env.CUSTOMERIO_APP_API_KEY) {
    note("CUSTOMERIO_APP_API_KEY not set — skipping ingest.")
    note("This is not an error — the page will show its setup instructions instead.")
    return
  }

  // VERCEL_ENV is "production" | "preview" | "development" on Vercel, and unset
  // when building locally. Local builds are allowed to ingest so the behaviour
  // can be exercised on demand.
  const vercelEnv = process.env.VERCEL_ENV
  const onPreview = vercelEnv !== undefined && vercelEnv !== "production"
  const previewOptIn = process.env.CATALOGUE_INGEST_ON_PREVIEW === "true"

  if (onPreview && !previewOptIn) {
    note(`VERCEL_ENV=${vercelEnv} — skipping ingest on non-production deploy.`)
    note("This is not an error. Set CATALOGUE_INGEST_ON_PREVIEW=true to ingest on previews too.")
    return
  }

  const startedAt = Date.now()
  note("Ingesting the Customer.io archive before build…")

  try {
    const { runIngest } = await import("./ingest")
    await runIngest()
    const seconds = Math.round((Date.now() - startedAt) / 1000)
    console.log(`${GREEN}[catalogue]${RESET} Snapshot built in ${seconds}s.`)
  } catch (err) {
    // Deliberately exit 0: see guard 3 above.
    warn(`ingest failed after ${Math.round((Date.now() - startedAt) / 1000)}s — the build will continue.`)
    warn(`  ${err instanceof Error ? err.message : String(err)}`)
    note("Continuing with the existing snapshot, if any.")
  }
}

main().catch((err) => {
  // Even an unexpected failure in the wrapper itself must not fail the build.
  warn(`unexpected error, continuing build: ${err instanceof Error ? err.message : err}`)
})
