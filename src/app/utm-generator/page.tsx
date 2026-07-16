"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const utmSources = [
  "facebook", "twitter", "instagram", "google", "carbon", "outreach", "sfmc",
  "dailydev", "sfdc", "idg", "linkedin", "sales_rep", "qrcode", "reddit",
  "discord", "stackadapt", "retail_dive", "foundry", "selling_simplified",
  "spiceworks", "partner", "sponsor", "youtube", "turbo", "next-site",
  "vercel-site", "turborepo-site", "svelte-site", "marketo", "brand",
  "event", "tldr", "ai_sdk", "tanstack", "v0-site", "shadcn-site", "cio"
]

const utmMediums = ["cpc", "email", "display", "social", "print", "third_party", "web", "newsletter", "blog", "ebook"]

const commonGroupings = [
  { medium: "social", source: "facebook" },
  { medium: "social", source: "twitter" },
  { medium: "social", source: "linkedin" },
  { medium: "cpc", source: "google" },
  { medium: "email", source: "cio" },
  { medium: "third_party", source: "partner" },
]

export default function UTMGenerator() {
  const [baseUrl, setBaseUrl] = useState("")
  const [utmSource, setUtmSource] = useState("")
  const [utmMedium, setUtmMedium] = useState("")
  const [utmCampaign, setUtmCampaign] = useState("")
  const [generatedUrl, setGeneratedUrl] = useState("")
  const [queryString, setQueryString] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [isQueryCopied, setIsQueryCopied] = useState(false)
  const { toast } = useToast()

  const generateUrl = () => {
    const trimmedBase = baseUrl.trim()

    // Base URL is optional. Only validate it if one was provided.
    if (trimmedBase && !trimmedBase.match(/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/)) {
      toast({
        title: "Invalid base URL",
        description: "Please enter a valid domain and path.",
        variant: "destructive",
      })
      setGeneratedUrl("")
      setQueryString("")
      return
    }

    const params = new URLSearchParams({
      utm_medium: utmMedium,
      utm_source: utmSource,
      utm_campaign: utmCampaign
    })
    const queryStr = params.toString()
    setQueryString(queryStr)

    if (trimmedBase) {
      const url = `https://${trimmedBase}${trimmedBase.includes('?') ? '&' : '?'}${queryStr}`
      setGeneratedUrl(url)
    } else {
      setGeneratedUrl("")
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl)
    setIsCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "The full UTM URL has been copied to your clipboard.",
    })
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleQueryCopy = () => {
    navigator.clipboard.writeText(queryString)
    setIsQueryCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "The query string has been copied to your clipboard.",
    })
    setTimeout(() => setIsQueryCopied(false), 2000)
  }

  const handleGroupingSelect = (medium: string, source: string) => {
    setUtmMedium(medium)
    setUtmSource(source)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">UTM Generator</h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="baseUrl">Base URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm bg-muted border border-r-0 border-input rounded-l-md">
              https://
            </span>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="domain.com/page"
              className="rounded-l-none"
            />
          </div>
        </div>

        <div>
          <Label>Common Source/Medium Groupings</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {commonGroupings.map((group) => (
              <Button
                key={`${group.source}-${group.medium}`}
                variant="outline"
                className={`text-sm ${
                  utmMedium === group.medium && utmSource === group.source
                    ? 'border-primary ring-2 ring-ring'
                    : ''
                }`}
                onClick={() => handleGroupingSelect(group.medium, group.source)}
              >
                {group.medium} / {group.source}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="utmMedium">UTM Medium</Label>
          <Select value={utmMedium} onValueChange={setUtmMedium}>
            <SelectTrigger>
              <SelectValue placeholder="Select UTM medium" />
            </SelectTrigger>
            <SelectContent>
              {utmMediums.map((medium) => (
                <SelectItem key={medium} value={medium}>{medium}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="utmSource">UTM Source</Label>
          <Select value={utmSource} onValueChange={setUtmSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select UTM source" />
            </SelectTrigger>
            <SelectContent>
              {utmSources.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="utmCampaign">UTM Campaign</Label>
          <Input
            id="utmCampaign"
            value={utmCampaign}
            onChange={(e) => setUtmCampaign(e.target.value)}
            placeholder="Enter campaign name"
          />
        </div>

        <Button onClick={generateUrl} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          Generate UTM URL
        </Button>

        {queryString && (
          <div className="space-y-3">
            {/* Full URL — only when a base URL was provided */}
            {generatedUrl && (
              <div className="p-4 bg-card border border-border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Full UTM URL</Label>
                    <p className="text-sm font-mono break-all">{generatedUrl}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Query String Only */}
            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Query String Only</Label>
                  <p className="text-sm font-mono break-all">{queryString}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleQueryCopy}
                  className="shrink-0"
                >
                  {isQueryCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
