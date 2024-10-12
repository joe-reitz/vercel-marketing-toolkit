// src/components/Navigation.tsx
import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-vercel-black text-vercel-white p-4 border-b border-vercel-gray">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold flex items-center">
          <span className="mr-2">▲</span>
          Vercel Marketing Toolkit
        </Link>
        <ul className="flex space-x-4">
          <li><Link href="/campaign-naming" className="hover:text-vercel-gray transition-colors">Campaign Naming</Link></li>
          <li><Link href="/date-time-picker" className="hover:text-vercel-gray transition-colors">Date & Time</Link></li>
          <li><Link href="/utm-generator" className="hover:text-vercel-gray transition-colors">UTM Generator</Link></li>
          <li><Link href="/email-builder" className="hover:text-vercel-gray transition-colors">Email Builder</Link></li>
          <li><Link href="/image-generator" className="hover:text-vercel-gray transition-colors">Image Generator</Link></li>
        </ul>
      </div>
    </nav>
  )
}