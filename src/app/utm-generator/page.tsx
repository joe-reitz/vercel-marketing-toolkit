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
  "event", "tldr", "ai_sdk", "tanstack", "v0-site", "shadcn-site", "inflection"
]

const utmMediums = ["cpc", "email", "display", "social", "print", "third_party", "web", "newsletter", "blog", "ebook"]

const commonGroupings = [
  { medium: "social", source: "facebook" },
  { medium: "social", source: "twitter" },
  { medium: "social", source: "linkedin" },
  { medium: "cpc", source: "google" },
  { medium: "email", source: "inflection" },
  { medium: "third_party", source: "partner" },
]

export default function UTMGenerator() {
  const [baseUrl, setBaseUrl] = useState("")
  const [utmSource, setUtmSource] = useState("")
  const [utmMedium, setUtmMedium] = useState("")
  const [utmCampaign, setUtmCampaign] = useState("")
  const [generatedUrl, setGeneratedUrl] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const { toast } = useToast()

  const generateUrl = () => {
    if (!baseUrl.match(/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/)) {
      toast({
        title: "Invalid base URL",
        description: "Please enter a valid domain and path.",
        variant: "destructive",
      })
      setGeneratedUrl("")
      return
    }

    const params = new URLSearchParams({
      utm_medium: utmMedium,
      utm_source: utmSource,
      utm_campaign: utmCampaign
    })
    const url = `https://${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`
    setGeneratedUrl(url)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl)
    setIsCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "The UTM URL has been copied to your clipboard.",
    })
    setTimeout(() => setIsCopied(false), 2000)
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
          <Label htmlFor="baseUrl">Base URL</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
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
                    ? 'border-blue-500'
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

        <Button onClick={generateUrl} className="w-full bg-blue-500 hover:bg-blue-800 text-white">
          Generate UTM URL
        </Button>

        {generatedUrl && (
          <div className="mt-4 p-4 bg-green-500 rounded flex items-center justify-between">
            <div>
              <Label className="text-white">Generated UTM URL:</Label>
              <p className="text-sm font-mono break-all text-white">{generatedUrl}</p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCopy}
              className={`transition-all duration-300 ${isCopied ? 'bg-green-700' : 'bg-green-800'}`}
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}