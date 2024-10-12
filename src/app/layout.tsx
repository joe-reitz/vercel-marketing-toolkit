// src/app/layout.tsx
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
    <html lang="en" className="dark">
      <body className={`${GeistSans.className} bg-vercel-black text-vercel-white`}>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}