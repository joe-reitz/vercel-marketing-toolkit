"use client"

import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navItems = [
  { href: '/prd-generator', label: 'PRD' },
  { href: '/naming-generators', label: 'Naming' },
  { href: '/date-time-picker', label: 'Date & Time' },
  { href: '/utm-generator', label: 'UTM' },
  { href: '/image-generator', label: 'Images' },
  { href: '/qr-code-generator', label: 'QR Codes' },
  { href: '/content-analyzer', label: 'Content' },
  { href: '/email-review', label: 'Email Review' },
  { href: '/soql-query-helper', label: 'Data Tools' },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <span className="text-2xl font-bold">▲</span>
              <span className="font-semibold text-lg hidden sm:inline-block">Marketing Toolkit</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden relative h-9 w-9 rounded-md border border-border bg-card hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              ) : (
                <Menu className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
