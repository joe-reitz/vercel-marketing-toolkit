"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Copy, Check, AlertCircle, Maximize2 } from "lucide-react"

const contentTypes = [
  { value: "email", label: "Email" },
  { value: "webpage", label: "Webpage Copy" },
  { value: "blog", label: "Blog Post" },
  { value: "social", label: "Social Post" },
  { value: "ad", label: "Ad Copy" },
  { value: "product", label: "Product Description" },
  { value: "docs", label: "Documentation" },
]

export default function ContentAnalyzerPage() {
  const [inputContent, setInputContent] = useState("")
  const [contentType, setContentType] = useState("")
  const [outputContent, setOutputContent] = useState("")
  const [improvements, setImprovements] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  
  // Email-specific fields
  const [emailSubject, setEmailSubject] = useState("")
  const [emailPreheader, setEmailPreheader] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [emailOutputSubject, setEmailOutputSubject] = useState("")
  const [emailOutputPreheader, setEmailOutputPreheader] = useState("")
  const [emailOutputBody, setEmailOutputBody] = useState("")

  // Full-screen edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedSubject, setEditedSubject] = useState("")
  const [editedPreheader, setEditedPreheader] = useState("")
  const [editedBody, setEditedBody] = useState("")
  const [editedContent, setEditedContent] = useState("")
  const [editCopied, setEditCopied] = useState(false)

  const handleAnalyze = async () => {
    // Validation
    if (!contentType) {
      setError("Please select a content type")
      return
    }

    if (contentType === "email") {
      if (!emailSubject.trim() && !emailPreheader.trim() && !emailBody.trim()) {
        setError("Please enter at least one email field")
        return
      }
    } else {
      if (!inputContent.trim()) {
        setError("Please enter some content to analyze")
        return
      }
    }

    setIsLoading(true)
    setError("")
    setOutputContent("")
    setImprovements([])
    setEmailOutputSubject("")
    setEmailOutputPreheader("")
    setEmailOutputBody("")

    try {
      const requestBody = contentType === "email" 
        ? {
            contentType: contentType,
            emailContent: {
              subject: emailSubject,
              preheader: emailPreheader,
              body: emailBody,
            }
          }
        : {
            content: inputContent,
            contentType: contentType,
          }

      const response = await fetch("/api/analyze-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze content")
      }

      const data = await response.json()
      
      if (contentType === "email" && data.emailContent) {
        setEmailOutputSubject(data.emailContent.subject || "")
        setEmailOutputPreheader(data.emailContent.preheader || "")
        setEmailOutputBody(data.emailContent.body || "")
      } else {
        setOutputContent(data.rewrittenContent)
      }
      
      setImprovements(data.improvements || [])
    } catch (err) {
      setError("Failed to analyze content. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    const textToCopy = contentType === "email"
      ? `Subject: ${emailOutputSubject}\n\nPreheader: ${emailOutputPreheader}\n\n${emailOutputBody}`
      : outputContent
      
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasEmailOutput = emailOutputSubject || emailOutputPreheader || emailOutputBody
  const hasOutput = contentType === "email" ? hasEmailOutput : outputContent

  const handleOpenEditModal = () => {
    if (contentType === "email") {
      setEditedSubject(emailOutputSubject)
      setEditedPreheader(emailOutputPreheader)
      setEditedBody(emailOutputBody)
    } else {
      setEditedContent(outputContent)
    }
    setIsEditModalOpen(true)
  }

  const handleCopyEdited = () => {
    const textToCopy = contentType === "email"
      ? `Subject: ${editedSubject}\n\nPreheader: ${editedPreheader}\n\n${editedBody}`
      : editedContent
      
    navigator.clipboard.writeText(textToCopy).then(() => {
      setEditCopied(true)
      setTimeout(() => setEditCopied(false), 2000)
    })
  }

  return (
    <div className="bg-black text-white p-4 sm:p-8 flex justify-center pt-16">
      <Card className="w-full max-w-5xl bg-black border-gray-800">
        <CardHeader className="p-6 border-b border-gray-800">
          <CardTitle className="text-white text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#0070f3]" />
            Content Analyzer & Rewriter
          </CardTitle>
          <CardDescription className="text-gray-400">
            Rewrite your content following Vercel&apos;s style guide using AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-type" className="text-gray-300 text-sm font-medium">
                  Content Type
                </Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger
                    id="content-type"
                    className="bg-gray-900 border-gray-700 text-white"
                  >
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {contentType === "email" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-subject" className="text-gray-300 text-sm font-medium">
                      Subject Line
                    </Label>
                    <input
                      id="email-subject"
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Enter email subject line..."
                      className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070f3] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    />
                    <p className="text-gray-500 text-xs h-4">
                      {emailSubject.length} characters {emailSubject.length > 0 && `• Optimal: 40-50 chars`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-preheader" className="text-gray-300 text-sm font-medium">
                      Preheader Text
                    </Label>
                    <input
                      id="email-preheader"
                      type="text"
                      value={emailPreheader}
                      onChange={(e) => setEmailPreheader(e.target.value)}
                      placeholder="Enter preheader text..."
                      className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070f3] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    />
                    <p className="text-gray-500 text-xs h-4">
                      {emailPreheader.length} characters {emailPreheader.length > 0 && `• Optimal: 40-130 chars`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-body" className="text-gray-300 text-sm font-medium">
                      Email Body
                    </Label>
                    <Textarea
                      id="email-body"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Paste your email body content here..."
                      rows={10}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                    />
                    <p className="text-gray-500 text-xs h-4">
                      {emailBody.length} characters
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="input-content" className="text-gray-300 text-sm font-medium">
                    Original Content
                  </Label>
                  <Textarea
                    id="input-content"
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    placeholder="Paste your content here..."
                    rows={16}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                  />
                  <p className="text-gray-500 text-xs">
                    {inputContent.length} characters
                  </p>
                </div>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={isLoading || !contentType || (contentType !== "email" && !inputContent.trim())}
                className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white h-12 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze & Rewrite
                  </>
                )}
              </Button>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-900 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Output Section */}
            <div className="space-y-4">
              {isLoading ? (
                contentType === "email" ? (
                  <div className="space-y-4">
                    {/* Spacer to align with Subject Line on left */}
                    <div className="h-[72px]"></div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium">
                        Rewritten Subject Line
                      </Label>
                      <div className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2">
                        <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
                      </div>
                      <p className="text-gray-500 text-xs h-4">\u00A0</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium">
                        Rewritten Preheader
                      </Label>
                      <div className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2">
                        <div className="h-4 bg-gray-700 rounded animate-pulse w-2/3"></div>
                      </div>
                      <p className="text-gray-500 text-xs h-4">\u00A0</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium">
                        Rewritten Email Body
                      </Label>
                      <div className="w-full rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 space-y-2" style={{ height: '250px' }}>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-full"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-5/6"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-4/5"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-full"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
                      </div>
                      <p className="text-gray-500 text-xs h-4">\u00A0</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Spacer to align with Original Content on left (accounting for Content Type dropdown) */}
                    <div className="h-[72px]"></div>
                    
                    <Label className="text-gray-300 text-sm font-medium">
                      Rewritten Content
                    </Label>
                    <div className="w-full rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 space-y-2" style={{ height: '400px' }}>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-full"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-5/6"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-4/5"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-full"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-5/6"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-full"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3"></div>
                    </div>
                    <p className="text-gray-500 text-xs">\u00A0</p>
                  </div>
                )
              ) : contentType === "email" ? (
                <div className="space-y-4">
                  {/* Spacer to align with Subject Line on left (accounting for Content Type dropdown) */}
                  <div className="h-[72px]"></div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">
                      Rewritten Subject Line
                    </Label>
                    <input
                      type="text"
                      value={emailOutputSubject}
                      readOnly
                      placeholder="Rewritten subject will appear here..."
                      className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                    />
                    <p className="text-gray-500 text-xs h-4">
                      {emailOutputSubject ? `${emailOutputSubject.length} characters` : '\u00A0'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">
                      Rewritten Preheader
                    </Label>
                    <input
                      type="text"
                      value={emailOutputPreheader}
                      readOnly
                      placeholder="Rewritten preheader will appear here..."
                      className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                    />
                    <p className="text-gray-500 text-xs h-4">
                      {emailOutputPreheader ? `${emailOutputPreheader.length} characters` : '\u00A0'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-medium">
                      Rewritten Email Body
                    </Label>
                    <Textarea
                      value={emailOutputBody}
                      readOnly
                      placeholder="Rewritten email body will appear here..."
                      rows={10}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                    />
                    <p className="text-gray-500 text-xs h-4">
                      {emailOutputBody ? `${emailOutputBody.length} characters` : '\u00A0'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Spacer to align with Original Content on left (accounting for Content Type dropdown) */}
                  <div className="h-[72px]"></div>
                  
                  <Label className="text-gray-300 text-sm font-medium">
                    Rewritten Content
                  </Label>
                  <Textarea
                    value={outputContent}
                    readOnly
                    placeholder="Rewritten content will appear here..."
                    rows={16}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                  />
                  {outputContent && (
                    <p className="text-gray-500 text-xs">
                      {outputContent.length} characters
                    </p>
                  )}
                </div>
              )}

              {!isLoading && hasOutput && (
                <div className="space-y-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="w-full border-gray-700 hover:bg-gray-800 text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleOpenEditModal}
                    variant="outline"
                    className="w-full border-gray-700 hover:bg-gray-800 text-white"
                  >
                    <Maximize2 className="mr-2 h-4 w-4" /> Edit Full Screen
                  </Button>
                </div>
              )}

              {isLoading && (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm font-medium">
                    Key Improvements
                  </Label>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#0070f3] flex-shrink-0">•</span>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#0070f3] flex-shrink-0">•</span>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-5/6"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#0070f3] flex-shrink-0">•</span>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-4/5"></div>
                    </div>
                  </div>
                </div>
              )}

              {!isLoading && improvements.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm font-medium">
                    Key Improvements
                  </Label>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-md p-4 space-y-2">
                    {improvements.map((improvement, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-[#0070f3] flex-shrink-0">•</span>
                        <p className="text-gray-300 text-sm">{improvement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Style Guide Summary */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <h3 className="text-white font-semibold mb-3">Vercel Style Guide Highlights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">✂️ Keep it Short</h4>
                <p className="text-gray-400 text-xs">
                  Short sentences. Fewer commas. More periods.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">🎯 Benefit-Driven</h4>
                <p className="text-gray-400 text-xs">
                  Lead with benefits. Use metrics when possible.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">⚡ Action-Oriented</h4>
                <p className="text-gray-400 text-xs">
                  Start with verbs. Make the reader the hero.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">🚫 No Exclamation Points</h4>
                <p className="text-gray-400 text-xs">
                  Never. Keep tone calm and factual.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">📋 Make it Scannable</h4>
                <p className="text-gray-400 text-xs">
                  Use bullets. Clear hierarchies. One idea per paragraph.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">🔧 Technical Precision</h4>
                <p className="text-gray-400 text-xs">
                  Use technical terms clearly. Avoid buzzwords.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">✨ Active Voice</h4>
                <p className="text-gray-400 text-xs">
                  Say &quot;you&quot; more than &quot;we&quot;. Stay positive.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-md p-3">
                <h4 className="text-white text-sm font-medium mb-1.5">❌ Strip Qualifiers</h4>
                <p className="text-gray-400 text-xs">
                  Remove &quot;basically&quot;, &quot;probably&quot;, &quot;might&quot;.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full-Screen Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl h-[90vh] bg-black border-gray-800 text-white overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-semibold">Edit Content</DialogTitle>
            <DialogDescription className="text-gray-400">
              Make any edits to your content before copying.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {contentType === "email" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-subject" className="text-gray-300 text-sm font-medium">
                    Subject Line
                  </Label>
                  <input
                    id="edit-subject"
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070f3] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  />
                  <p className="text-gray-500 text-xs">
                    {editedSubject.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-preheader" className="text-gray-300 text-sm font-medium">
                    Preheader Text
                  </Label>
                  <input
                    id="edit-preheader"
                    type="text"
                    value={editedPreheader}
                    onChange={(e) => setEditedPreheader(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070f3] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  />
                  <p className="text-gray-500 text-xs">
                    {editedPreheader.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-body" className="text-gray-300 text-sm font-medium">
                    Email Body
                  </Label>
                  <Textarea
                    id="edit-body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={20}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-y min-h-[200px]"
                  />
                  <p className="text-gray-500 text-xs">
                    {editedBody.length} characters
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-content" className="text-gray-300 text-sm font-medium">
                  Content
                </Label>
                <Textarea
                  id="edit-content"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={25}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-y min-h-[400px]"
                />
                <p className="text-gray-500 text-xs">
                  {editedContent.length} characters
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-800 flex gap-2">
            <Button
              onClick={handleCopyEdited}
              className="flex-1 bg-[#0070f3] hover:bg-[#0060df] text-white"
            >
              {editCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copy Edited Content
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsEditModalOpen(false)}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

