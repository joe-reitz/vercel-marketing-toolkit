"use client"

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const regions = ["GLOBAL", "NAMER", "APAC", "EMEA", "LATAM"]
const audiences = ["Hobby", "Pro", "Hobby-Pro", "v0", "Enterprise"]
const activationStages = ["Welcome", "Pre-Deploy", "Pre-Activation", "Post-Activation"]
const contentDescriptions = [
  "resources-builders",
  "resources-migrators",
  "resources-generic",
  "intro-video",
  "feature-adoption-analytics",
  "feature-adoption-toolbar"
]

export default function CampaignNamingGenerator() {
  const [region, setRegion] = useState("")
  const [audience, setAudience] = useState("")
  const [activationStage, setActivationStage] = useState("")
  const [contentDescription, setContentDescription] = useState("")
  const [date, setDate] = useState("")
  const [version, setVersion] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const { toast } = useToast()

  const generateCampaignName = () => {
    const formattedDate = date ? new Date(date).toISOString().split('T')[0].replace(/-/g, '') : ''
    const name = [region, audience, activationStage, contentDescription, formattedDate, version]
      .filter(Boolean)
      .join('_')
      .toLowerCase()
    setCampaignName(name)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Campaign Naming Convention Generator</h1>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="region">Region</Label>
          <Select onValueChange={setRegion}>
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="audience">Audience</Label>
          <Select onValueChange={setAudience}>
            <SelectTrigger>
              <SelectValue placeholder="Select audience" />
            </SelectTrigger>
            <SelectContent>
              {audiences.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="activationStage">Activation Stage / Type</Label>
          <Select onValueChange={setActivationStage}>
            <SelectTrigger>
              <SelectValue placeholder="Select activation stage" />
            </SelectTrigger>
            <SelectContent>
              {activationStages.map((stage) => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="contentDescription">Content Description / Group</Label>
          <Select onValueChange={setContentDescription}>
            <SelectTrigger>
              <SelectValue placeholder="Select content description" />
            </SelectTrigger>
            <SelectContent>
              {contentDescriptions.map((desc) => (
                <SelectItem key={desc} value={desc}>{desc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="version">Version / Experiment</Label>
          <Input
            type="text"
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g., 1, 1a, etc."
          />
        </div>

        <Button onClick={generateCampaignName} className="w-full bg-blue-500 hover:bg-blue-800  text-white">
          Generate Campaign Name
        </Button>

        {campaignName && (
          <div className="mt-4 p-4 bg-green-500 rounded flex items-center justify-between">
            <div>
              <Label className="text-white">Generated Campaign Name:</Label>
              <p className="text-lg font-mono break-all text-white">{campaignName}</p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(campaignName)
                setIsCopied(true)
                toast({
                  title: "Copied to clipboard",
                  description: "The campaign name has been copied to your clipboard.",
                })
                setTimeout(() => setIsCopied(false), 2000)
              }}
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