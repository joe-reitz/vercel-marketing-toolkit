// src/app/page.tsx
import Link from 'next/link'
import { BarChart, Calendar, Link as LinkIcon, Mail, Image as ImageIcon } from 'lucide-react'

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to Vercel Marketing Toolkit</h1>
      <p className="text-xl">Select a tool to get started:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/campaign-naming" className="flex flex-col items-center justify-center p-6 border border-vercel-gray rounded-lg hover:bg-vercel-white hover:text-vercel-black transition-all duration-300 group">
          <BarChart className="w-12 h-12 mb-4 group-hover:text-vercel-black" />
          <span className="text-lg font-semibold">Campaign Naming Generator</span>
        </Link>
        <Link href="/date-time-picker" className="flex flex-col items-center justify-center p-6 border border-vercel-gray rounded-lg hover:bg-vercel-white hover:text-vercel-black transition-all duration-300 group">
          <Calendar className="w-12 h-12 mb-4 group-hover:text-vercel-black" />
          <span className="text-lg font-semibold">Date & Time Picker</span>
        </Link>
        <Link href="/utm-generator" className="flex flex-col items-center justify-center p-6 border border-vercel-gray rounded-lg hover:bg-vercel-white hover:text-vercel-black transition-all duration-300 group">
          <LinkIcon className="w-12 h-12 mb-4 group-hover:text-vercel-black" />
          <span className="text-lg font-semibold">UTM Parameter Generator</span>
        </Link>
        <Link href="/email-builder" className="flex flex-col items-center justify-center p-6 border border-vercel-gray rounded-lg hover:bg-vercel-white hover:text-vercel-black transition-all duration-300 group">
          <Mail className="w-12 h-12 mb-4 group-hover:text-vercel-black" />
          <span className="text-lg font-semibold">Email Builder</span>
        </Link>
        <Link href="/image-generator" className="flex flex-col items-center justify-center p-6 border border-vercel-gray rounded-lg hover:bg-vercel-white hover:text-vercel-black transition-all duration-300 group">
          <ImageIcon className="w-12 h-12 mb-4 group-hover:text-vercel-black" />
          <span className="text-lg font-semibold">Image Generator</span>
        </Link>
      </div>
    </div>
  )
}