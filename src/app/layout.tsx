import './globals.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Vercel Marketing Toolkit',
  description: 'A toolkit for Vercel marketing operations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${GeistSans.className} bg-vercel-black text-vercel-white flex flex-col h-full`}>
        <Navigation />
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  )
}