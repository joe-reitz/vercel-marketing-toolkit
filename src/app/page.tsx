import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  Image,
  LinkIcon,
  MessageSquare,
  ScanSearch,
  QrCode,
  Sparkles,
  Mail,
  LayoutGrid
} from 'lucide-react'

const tools = [
  {
    href: '/prd-generator',
    icon: FileText,
    title: 'Request PRD Generator',
    description: 'Turn a rough request into a PRD your team can build from',
    color: 'from-indigo-500/40 to-indigo-500/40 hover:from-indigo-500/50 hover:to-indigo-500/50 dark:from-indigo-300/20 dark:to-indigo-300/20 dark:hover:from-indigo-300/30 dark:hover:to-indigo-300/30',
    lightText: false
  },
  {
    href: '/naming-generators',
    icon: MessageSquare,
    title: 'Naming Generators',
    description: 'Generate compelling names for your campaigns and projects',
    color: 'from-blue-500/40 to-blue-500/40 hover:from-blue-500/50 hover:to-blue-500/50 dark:from-blue-300/20 dark:to-blue-300/20 dark:hover:from-blue-300/30 dark:hover:to-blue-300/30',
    lightText: false
  },
  {
    href: '/date-time-picker',
    icon: CalendarDays,
    title: 'Date & Time Picker',
    description: 'Convert and manage timezones for global campaigns',
    color: 'from-purple-500/40 to-purple-500/40 hover:from-purple-500/50 hover:to-purple-500/50 dark:from-purple-300/20 dark:to-purple-300/20 dark:hover:from-purple-300/30 dark:hover:to-purple-300/30',
    lightText: false
  },
  {
    href: '/utm-generator',
    icon: LinkIcon,
    title: 'UTM Generator',
    description: 'Create trackable campaign URLs with UTM parameters',
    color: 'from-green-500/40 to-green-500/40 hover:from-green-500/50 hover:to-green-500/50 dark:from-green-300/20 dark:to-green-300/20 dark:hover:from-green-300/30 dark:hover:to-green-300/30',
    lightText: false
  },
  {
    href: '/image-generator',
    icon: Image,
    title: 'Image Generator',
    description: 'Generate marketing images for your campaigns',
    color: 'from-red-500/40 to-red-500/40 hover:from-red-500/50 hover:to-red-500/50 dark:from-red-300/20 dark:to-red-300/20 dark:hover:from-red-300/30 dark:hover:to-red-300/30',
    lightText: false
  },
  {
    href: '/qr-code-generator',
    icon: QrCode,
    title: 'QR Code Generator',
    description: 'Create QR codes for events and campaigns',
    color: 'from-blue-500/40 to-blue-500/40 hover:from-blue-500/50 hover:to-blue-500/50 dark:from-blue-300/20 dark:to-blue-300/20 dark:hover:from-blue-300/30 dark:hover:to-blue-300/30',
    lightText: false
  },
  {
    href: '/content-analyzer',
    icon: Sparkles,
    title: 'Content Analyzer',
    description: 'AI-powered content analysis and optimization',
    color: 'from-amber-500/40 to-amber-500/40 hover:from-amber-500/50 hover:to-amber-500/50 dark:from-amber-300/20 dark:to-amber-300/20 dark:hover:from-amber-300/30 dark:hover:to-amber-300/30',
    lightText: false
  },
  {
    href: '/email-review',
    icon: Mail,
    title: 'Email Review Agent',
    description: 'AI-powered email quality assurance and optimization',
    color: 'from-teal-500/40 to-teal-500/40 hover:from-teal-500/50 hover:to-teal-500/50 dark:from-teal-300/20 dark:to-teal-300/20 dark:hover:from-teal-300/30 dark:hover:to-teal-300/30',
    lightText: false
  },
  {
    href: '/email-catalogue',
    icon: LayoutGrid,
    title: 'Email Catalogue',
    description: 'Browse every email sent from Customer.io with click heatmaps',
    color: 'from-orange-500/40 to-orange-500/40 hover:from-orange-500/50 hover:to-orange-500/50 dark:from-orange-300/20 dark:to-orange-300/20 dark:hover:from-orange-300/30 dark:hover:to-orange-300/30',
    lightText: false
  },
  {
    href: '/soql-query-helper',
    icon: ScanSearch,
    title: 'SOQL Query Helper',
    description: 'Generate and test Salesforce SOQL queries',
    color: 'from-pink-500/40 to-pink-500/40 hover:from-pink-500/50 hover:to-pink-500/50 dark:from-pink-300/20 dark:to-pink-300/20 dark:hover:from-pink-300/30 dark:hover:to-pink-300/30',
    lightText: false
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="text-6xl">▲</div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Vercel Marketing Toolkit
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive suite of tools to power your marketing campaigns
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {tools.map(({ href, icon: Icon, title, description, color }) => (
            <Link
              key={href}
              href={href}
              className="group relative"
            >
              <div className={`h-full p-6 rounded-xl border border-border bg-gradient-to-br ${color} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-foreground/20`}>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-card border border-border group-hover:border-foreground/30 transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Text */}
        <div className="text-center mt-16">
          <p className="text-sm text-muted-foreground">
            Built with 🖤 by the MOPs team
          </p>
        </div>
      </div>
    </main>
  )
}
