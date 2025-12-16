'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Copy, Check } from 'lucide-react'

export default function DataToolsPage() {
  // SOQL Query Helper State
  const [soqlInput, setSoqlInput] = useState('')
  const [soqlOutput, setSoqlOutput] = useState('')
  const [soqlCopied, setSoqlCopied] = useState(false)

  // Comma Separator State
  const [separatorInput, setSeparatorInput] = useState('')
  const [separatorOutput, setSeparatorOutput] = useState('')
  const [separatorCopied, setSeparatorCopied] = useState(false)

  const [activeTab, setActiveTab] = useState('soql')

  const handleSoqlFormat = () => {
    const inputArray = soqlInput.split(/\r?\n/).filter(item => item.trim() !== '')
    const formattedOutput = inputArray.length ? `'${inputArray.join("','")}'` : ''
    setSoqlOutput(formattedOutput)
  }

  const handleCommaSeparate = () => {
    // Split by newlines, tabs, or multiple spaces (common in spreadsheet pastes)
    const inputArray = separatorInput
      .split(/[\n\r\t]+/)
      .map(item => item.trim())
      .filter(item => item !== '')
    const formattedOutput = inputArray.join(', ')
    setSeparatorOutput(formattedOutput)
  }

  const copySoqlToClipboard = () => {
    navigator.clipboard.writeText(soqlOutput).then(() => {
      setSoqlCopied(true)
      setTimeout(() => setSoqlCopied(false), 2000)
    })
  }

  const copySeparatorToClipboard = () => {
    navigator.clipboard.writeText(separatorOutput).then(() => {
      setSeparatorCopied(true)
      setTimeout(() => setSeparatorCopied(false), 2000)
    })
  }

  return (
    <div className="bg-black text-white p-4 sm:p-8 flex justify-center pt-16">
      <Card className="w-full max-w-3xl bg-black border-gray-800">
        <CardHeader className="p-6 border-b border-gray-800">
          <CardTitle className="text-white text-2xl font-semibold">Data Tools</CardTitle>
          <CardDescription className="text-gray-400">
            Format data for SOQL queries or convert spreadsheet data to comma-separated values.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-900">
              <TabsTrigger 
                value="soql"
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                SOQL Query Helper
              </TabsTrigger>
              <TabsTrigger
                value="separator"
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                Comma Separator
              </TabsTrigger>
            </TabsList>

            {/* SOQL Query Helper Tab */}
            <TabsContent value="soql" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="soql-input" className="text-gray-300 text-sm font-medium">
                  Input (one value per line)
                </Label>
                <Textarea
                  id="soql-input"
                  placeholder="value1&#10;value2&#10;value3"
                  value={soqlInput}
                  onChange={(e) => setSoqlInput(e.target.value)}
                  rows={10}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 font-mono"
                />
              </div>

              <Button 
                onClick={handleSoqlFormat} 
                className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white h-12 text-base font-medium"
              >
                Format for SOQL
              </Button>

              {soqlOutput && (
                <div className="space-y-2">
                  <Label htmlFor="soql-output" className="text-gray-300 text-sm font-medium">
                    SOQL Formatted Output
                  </Label>
                  <Textarea
                    id="soql-output"
                    value={soqlOutput}
                    readOnly
                    rows={5}
                    className="bg-gray-900 border-gray-700 text-white font-mono"
                  />
                  <Button
                    onClick={copySoqlToClipboard}
                    variant="outline"
                    className="w-full border-gray-700 hover:bg-gray-800 text-white"
                  >
                    {soqlCopied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Comma Separator Tab */}
            <TabsContent value="separator" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="separator-input" className="text-gray-300 text-sm font-medium">
                  Input (paste from spreadsheet)
                </Label>
                <Textarea
                  id="separator-input"
                  placeholder="Paste your spreadsheet values here...&#10;Each value on a new line or tab-separated"
                  value={separatorInput}
                  onChange={(e) => setSeparatorInput(e.target.value)}
                  rows={10}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 font-mono"
                />
              </div>

              <Button 
                onClick={handleCommaSeparate} 
                className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white h-12 text-base font-medium"
              >
                Convert to Comma-Separated
              </Button>

              {separatorOutput && (
                <div className="space-y-2">
                  <Label htmlFor="separator-output" className="text-gray-300 text-sm font-medium">
                    Comma-Separated Output
                  </Label>
                  <Textarea
                    id="separator-output"
                    value={separatorOutput}
                    readOnly
                    rows={5}
                    className="bg-gray-900 border-gray-700 text-white font-mono"
                  />
                  <Button
                    onClick={copySeparatorToClipboard}
                    variant="outline"
                    className="w-full border-gray-700 hover:bg-gray-800 text-white"
                  >
                    {separatorCopied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

