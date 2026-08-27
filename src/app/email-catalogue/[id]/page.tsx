import { notFound } from "next/navigation"
import { EmailViewer } from "@/components/email-catalogue/EmailViewer"
import { readEmail } from "@/lib/catalogue/snapshot"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = await readEmail(id)
  return {
    title: email
      ? `${email.subject || email.name} | Email Catalogue`
      : "Not found | Email Catalogue",
  }
}

export default async function EmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = await readEmail(id)
  if (!email) notFound()
  return <EmailViewer email={email} />
}
