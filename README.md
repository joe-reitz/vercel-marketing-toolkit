This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Email Catalogue

`/email-catalogue` — every email sent out of Customer.io, rendered as working
HTML, with a toggleable heatmap showing where people actually clicked. Covers
newsletters, campaign/journey emails, broadcasts, and transactional templates.

### Why a heatmap is possible at all

Customer.io's App API reports click metrics **keyed by each link's destination
`href`**, not by position. Every `<a>` in the rendered HTML is matched back to
its own click count, so the overlay sits on the real email rather than
approximating it.

### Setup

One credential, in the Vercel project's **Environment Variables** — same value
as `CUSTOMERIO_APP_API_KEY` in the mOperator Vercel project
([vercel/vercel-moperator](https://github.com/vercel/vercel-moperator)):

| Variable | Purpose |
|---|---|
| `CUSTOMERIO_APP_API_KEY` | App API bearer token. Without it the build skips the ingest and the page shows setup instructions. |
| `CUSTOMERIO_REGION` | `eu` for EU-hosted workspaces; defaults to `us`. |
| `CATALOGUE_DEPLOY_HOOK_URL` | Deploy Hook on `main`, for the nightly refresh. |
| `CRON_SECRET` | Any random string; gates the refresh route. |

This is the **App API** key (Workspace Settings → API Credentials → App API
Keys), not the Track API site id/key pair and not a service account token —
service account tokens authenticate a different host (`fly.customer.io`) and are
rejected by the `api.customer.io/v1` endpoints used here.

### Where the data comes from

The snapshot is built **during `next build`** by `scripts/build-ingest.ts`, so it
lands inside the build container and is traced into the deployment output. That
is why the Customer.io key only ever needs to exist in the Vercel project: no
GitHub Actions secret, no committed snapshot, and nothing reads the API at
runtime. `data/` is a build artifact and is gitignored.

The build step is defensive by design — a third-party API must never be the
reason a deploy fails:

- **No credential** → skip quietly, so `npm run build` works for anyone who
  hasn't configured Customer.io.
- **Preview deploy** → skip by default, so previews don't re-read the whole
  archive and burn the rate limit. Override with `CATALOGUE_INGEST_ON_PREVIEW=true`.
- **Ingest throws** → log loudly, exit 0. The build proceeds with whatever
  snapshot exists, or the page renders its "no snapshot" state.

Staleness stays visible either way: the index shows the snapshot's `generatedAt`,
so a skipped or failed refresh is legible in the UI rather than quietly passing
off old numbers as current.

### Nightly refresh

Click data changes daily, so refreshing means redeploying. The cron in
`vercel.json` calls `/api/email-catalogue/refresh`, which POSTs the Deploy Hook.
The ingest itself can't run in that function — serverless has no persistent
filesystem, so anything written would vanish when the invocation ends. The build
container is the only place a snapshot can be produced and kept.

### Running it locally (optional)

```bash
cp .env.local.example .env.local        # add the App API key
npm run catalogue:probe                 # read-only: verify endpoints, size the archive
npm run catalogue:ingest -- --limit 5   # small first pass
npm run catalogue:ingest                # full sweep
npm run catalogue:fixture               # synthetic data, no credentials needed
npm run catalogue:test                  # unit tests
```

A full sweep is ~4 requests per email against a documented 10/s ceiling, which
is also the cost added to each production build.

### Reading the heatmap honestly

The heatmap's job is to show where clicks went, which means being clear about
where it *can't* know. Each email states its own caveats above the render, and
the matcher never guesses.

| State | Meaning |
|---|---|
| Blue fill + rank badge | Matched to a tracked link; darker = more clicks |
| Dotted outline | Tracked, genuinely **zero** clicks |
| Faint thin outline | `mailto:` / `tel:` / `#anchor` — not trackable, and that's normal |
| Amber dashed + ⚠ | **Not attributable** — Liquid destination, no match, or ambiguous |

Also surfaced when it applies: links **sharing one destination** (a hero image
and the CTA below it — Customer.io reports one number that cannot be split
between them), tracked links **missing from the HTML** (edited after sending),
**invisible** preheader links, and newsletter counts **aggregated across A/B
variants**.

Click basis defaults to **unique human clicks** — email security scanners
generate machine clicks in volumes that visibly distort a heatmap. The selector
switches to all-clicks-deduped (which reconciles with Customer.io's headline
reports) or raw totals; all bases come from the same ingested data, so switching
refetches nothing.

### Notes for future edits

- Emails render in an iframe with `sandbox="allow-same-origin"` and deliberately
  **without** `allow-scripts` — nothing in an email executes, while the parent can
  still measure link positions. Adding `allow-scripts` alongside `allow-same-origin`
  would defeat the sandbox entirely.
- `getClientRects()`, not `getBoundingClientRect()` — a link wrapping across lines
  gets one box per line; the bounding box would be their union, tinting words
  nobody could click.
- The color ramp's anchor is chosen **per link** from the background actually
  behind it. An email isn't uniformly light or dark, and without this the hottest
  link in a typical email (a CTA on a dark brand block) renders as the least
  visible thing on the page.
- Liquid tags are highlighted by walking text nodes in the iframe DOM, never by
  regex over the HTML string — Liquid also appears inside attributes, and a string
  rewrite would inject markup into an `href`.
- `src/lib/cio/request.ts` ports the retry/backoff from mOperator's hardened
  Customer.io client, adding a token bucket and `Retry-After` support.
