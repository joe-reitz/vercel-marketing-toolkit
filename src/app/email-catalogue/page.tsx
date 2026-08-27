import { CatalogueBrowser } from "@/components/email-catalogue/CatalogueBrowser"
import { readIndex } from "@/lib/catalogue/snapshot"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Email Catalogue | Vercel Marketing Toolkit",
  description: "Every email sent out of Customer.io, rendered, with per-link click heatmaps.",
}

export default async function EmailCataloguePage() {
  const index = await readIndex()

  // First run: the snapshot doesn't exist yet. Say what to do rather than
  // rendering a convincingly empty catalogue.
  if (!index.emails.length) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Email Catalogue</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No snapshot found in <code>data/</code>. Build one with:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-card p-4 text-sm">
          {`# add the Customer.io App API key to .env.local first
CUSTOMERIO_APP_API_KEY=...

npm run catalogue:probe               # check endpoints + archive size
npm run catalogue:ingest -- --limit 5 # small first pass
npm run catalogue:ingest              # full sweep`}
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">
          To preview the UI without credentials:{" "}
          <code>npm run catalogue:fixture</code>
        </p>
      </div>
    )
  }

  return <CatalogueBrowser index={index} />
}
