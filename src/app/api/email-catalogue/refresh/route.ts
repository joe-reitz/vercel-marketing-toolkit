/**
 * Nightly refresh trigger for the email catalogue.
 *
 * Because the snapshot is built during `next build` (see scripts/build-ingest.ts),
 * refreshing the data means triggering a new deployment. This route is called by
 * the Vercel cron declared in vercel.json and does exactly one thing: POST to a
 * Vercel Deploy Hook, which rebuilds and re-ingests.
 *
 * Why not do the ingest here instead: a serverless function has no persistent
 * filesystem, so anything written would vanish when the invocation ends. The
 * build container is the only place a snapshot can be produced and kept.
 *
 * Setup — two Vercel env vars:
 *   CATALOGUE_DEPLOY_HOOK_URL   Project Settings → Git → Deploy Hooks → create
 *                               one on `main`, paste the URL here.
 *   CRON_SECRET                 Any random string. Vercel sends it as a bearer
 *                               token on cron invocations, and this route
 *                               rejects anything that doesn't match — otherwise
 *                               the URL is a public redeploy button.
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  // Fail closed. Without a configured secret the endpoint would let anyone on
  // the internet trigger unlimited rebuilds.
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; refusing to expose an unauthenticated redeploy trigger." },
      { status: 503 },
    )
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const hook = process.env.CATALOGUE_DEPLOY_HOOK_URL
  if (!hook) {
    return NextResponse.json(
      { error: "CATALOGUE_DEPLOY_HOOK_URL is not configured." },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(hook, { method: "POST" })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Deploy hook returned ${res.status}` },
        { status: 502 },
      )
    }
    return NextResponse.json({ triggered: true, at: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: `Could not reach the deploy hook: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}
