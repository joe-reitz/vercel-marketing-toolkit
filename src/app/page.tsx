import Link from 'next/link'
import { CalendarDays, Image, LinkIcon, Mail, MessageSquare, ScanSearch } from 'lucide-react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <main className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}>
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">Vercel Marketing Toolkit</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { href: '/naming-generators', icon: MessageSquare, title: 'Naming Generators' },
            { href: '/date-time-picker', icon: CalendarDays, title: 'Date/Time and Calendar Generator' },
            { href: '/utm-generator', icon: LinkIcon, title: 'UTM Parameter Generator' },
            { href: '/image-generator', icon: Image, title: 'Image Generator' },
            { href: '/qr-code-generator', icon: Image, title: 'QR Code Generator' },
            { href: '/soql-query-helper', icon: ScanSearch, title: 'SOQL Query Helper' },
          ].map(({ href, icon: Icon, title }) => (
            <Link
              key={href}
              href={href}
              className="group block p-6 bg-gray-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center space-x-4">
                <Icon className="h-6 w-6 text-gray-500" />
                <h2 className="text-xl font-semibold">{title}</h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}