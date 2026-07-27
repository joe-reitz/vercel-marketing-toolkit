"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { saveAs } from "file-saver"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  StopCircle,
  Wand2,
} from "lucide-react"
import {
  PRD_DESTINATIONS,
  REQUEST_TYPES,
  getRequestType,
  sectionsFor,
  type ClarifyingAnswer,
  type PrdIntake,
} from "@/lib/prd-template"

const STORAGE_KEY = "prd-generator:v1"

type Phase = "intake" | "clarify" | "draft"

interface Question {
  question: string
  why: string
}

const EMPTY_INTAKE: PrdIntake = {
  requestType: "",
  destination: "agent",
  title: "",
  brainDump: "",
  audience: "",
  outcome: "",
  targetDate: "",
  requestingTeam: "",
  constraints: "",
  links: "",
}

function filenameFor(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return `${slug || "prd"}.md`
}

export default function PrdGenerator() {
  const [phase, setPhase] = useState<Phase>("intake")
  const [intake, setIntake] = useState<PrdIntake>(EMPTY_INTAKE)
  const [showOptional, setShowOptional] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [isScreening, setIsScreening] = useState(false)

  const [markdown, setMarkdown] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [modelUsed, setModelUsed] = useState<string | null>(null)
  const [versions, setVersions] = useState<string[]>([])
  const [refineInstruction, setRefineInstruction] = useState("")

  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)
  const restored = useRef(false)

  const selectedType = getRequestType(intake.requestType)
  const sections = intake.requestType ? sectionsFor(intake.requestType) : []

  // --- Persistence: survive a refresh without a database ---------------------

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as {
          intake?: PrdIntake
          markdown?: string
        }
        if (saved.intake) setIntake({ ...EMPTY_INTAKE, ...saved.intake })
        if (saved.markdown) {
          setMarkdown(saved.markdown)
          setPhase("draft")
        }
      }
    } catch {
      // Corrupt or unavailable storage is not worth surfacing.
    }
    restored.current = true
  }, [])

  useEffect(() => {
    if (!restored.current) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ intake, markdown })
      )
    } catch {
      // Quota or private mode. Nothing actionable for the user.
    }
  }, [intake, markdown])

  // Abort any in-flight generation if the component goes away.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Follow the stream as it writes.
  useEffect(() => {
    if (isStreaming && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [markdown, isStreaming])

  const setField = (key: keyof PrdIntake, value: string) =>
    setIntake((prev) => ({ ...prev, [key]: value }))

  // --- Generation ------------------------------------------------------------

  const streamDraft = useCallback(
    async (payload: Record<string, unknown>, previous?: string) => {
      const controller = new AbortController()
      abortRef.current = controller

      setError("")
      setIsStreaming(true)
      setPhase("draft")
      setMarkdown("")

      try {
        const response = await fetch("/api/prd/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(data.error || "Could not generate the PRD.")
        }

        setModelUsed(response.headers.get("X-Prd-Model"))

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response stream from the server.")

        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setMarkdown(accumulated)
        }

        accumulated += decoder.decode()
        setMarkdown(accumulated)

        if (!accumulated.trim()) {
          throw new Error("The model returned an empty document. Try again.")
        }

        // Only bank the previous version once the new one actually arrived.
        if (previous) setVersions((prev) => [...prev, previous])
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError"

        // A half-finished refine is a truncated document, and the complete one
        // it replaced was never banked for undo — so put it back. On a first
        // draft there is nothing to restore, and a partial is better than none.
        if (previous) setMarkdown(previous)

        if (aborted) return // The user chose to stop; not an error worth showing.

        setError(
          err instanceof Error ? err.message : "Could not generate the PRD."
        )
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    []
  )

  const handleGenerate = async () => {
    if (!intake.requestType) {
      setError("Pick a request type first")
      return
    }
    if (!intake.brainDump.trim()) {
      setError("Describe what you need before generating")
      return
    }

    setError("")
    setIsScreening(true)

    try {
      const response = await fetch("/api/prd/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intake),
      })

      const data = (await response.json()) as {
        ready?: boolean
        questions?: Question[]
        error?: string
      }

      if (!response.ok) throw new Error(data.error || "Screening failed.")

      if (!data.ready && data.questions?.length) {
        setQuestions(data.questions)
        setAnswers(data.questions.map(() => ""))
        setPhase("clarify")
        setIsScreening(false)
        return
      }

      setIsScreening(false)
      await streamDraft({ mode: "draft", intake, answers: [] })
    } catch (err) {
      // Screening is a convenience, not a gate. If it fails, still let them draft.
      setIsScreening(false)
      setError(
        err instanceof Error
          ? `${err.message} You can still generate without it.`
          : "Screening failed. You can still generate without it."
      )
    }
  }

  const submitAnswers = async () => {
    const paired: ClarifyingAnswer[] = questions.map((q, i) => ({
      question: q.question,
      answer: answers[i] ?? "",
    }))
    await streamDraft({ mode: "draft", intake, answers: paired })
  }

  const handleRefine = async () => {
    if (!refineInstruction.trim() || !markdown.trim()) return
    const instruction = refineInstruction.trim()
    setRefineInstruction("")
    await streamDraft(
      {
        mode: "refine",
        intake,
        currentMarkdown: markdown,
        instruction,
      },
      markdown
    )
  }

  const handleUndo = () => {
    setVersions((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setMarkdown(last)
      return prev.slice(0, -1)
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    })
    saveAs(blob, filenameFor(intake.title))
  }

  const handleStartOver = () => {
    abortRef.current?.abort()
    setPhase("intake")
    setMarkdown("")
    setVersions([])
    setQuestions([])
    setAnswers([])
    setModelUsed(null)
    setError("")
  }

  const canGenerate =
    Boolean(intake.requestType) &&
    intake.brainDump.trim().length > 0 &&
    !isScreening &&
    !isStreaming

  // --- Render ----------------------------------------------------------------

  return (
    <div className="bg-background text-foreground p-4 sm:p-8 flex justify-center pt-16">
      <Card className="w-full max-w-6xl bg-background border-border">
        <CardHeader className="p-6 border-b border-border">
          <CardTitle className="text-foreground text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#0070f3]" />
            Request PRD Generator
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Turn a rough request into a structured PRD your team — or a coding
            agent — can build from. Paste the result straight into Notion.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ---------------------------------------------------- Left column */}
            <div className="space-y-4">
              {phase === "clarify" ? (
                <ClarifyPanel
                  questions={questions}
                  answers={answers}
                  onChange={(i, value) =>
                    setAnswers((prev) => {
                      const next = [...prev]
                      next[i] = value
                      return next
                    })
                  }
                  onBack={() => setPhase("intake")}
                  onSubmit={submitAnswers}
                  onSkip={() =>
                    streamDraft({ mode: "draft", intake, answers: [] })
                  }
                  busy={isStreaming}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="request-type"
                        className="text-muted-foreground text-sm font-medium"
                      >
                        Request type
                      </Label>
                      <Select
                        value={intake.requestType}
                        onValueChange={(value) =>
                          setField("requestType", value)
                        }
                      >
                        <SelectTrigger
                          id="request-type"
                          className="bg-card border-input text-foreground"
                        >
                          <SelectValue placeholder="What are you requesting?" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-input text-foreground">
                          {REQUEST_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="destination"
                        className="text-muted-foreground text-sm font-medium"
                      >
                        Who is this for?
                      </Label>
                      <Select
                        value={intake.destination}
                        onValueChange={(value) =>
                          setField("destination", value)
                        }
                      >
                        <SelectTrigger
                          id="destination"
                          className="bg-card border-input text-foreground"
                        >
                          <SelectValue placeholder="Who receives this PRD?" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-input text-foreground">
                          {PRD_DESTINATIONS.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-muted-foreground text-sm font-medium"
                    >
                      Working title
                    </Label>
                    <Input
                      id="title"
                      value={intake.title}
                      onChange={(e) => setField("title", e.target.value)}
                      placeholder="Meeting booking app"
                      className="bg-card border-input text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="brain-dump"
                      className="text-muted-foreground text-sm font-medium"
                    >
                      What do you need, and why?
                    </Label>
                    <Textarea
                      id="brain-dump"
                      value={intake.brainDump}
                      onChange={(e) => setField("brainDump", e.target.value)}
                      placeholder={
                        selectedType?.placeholder ??
                        "Describe what you want, who it is for, and what outcome it should drive. Plain language is fine."
                      }
                      rows={10}
                      className="bg-card border-input text-foreground placeholder:text-muted-foreground resize-none"
                    />
                    <p className="text-muted-foreground text-xs">
                      {intake.brainDump.length} characters. The more specific
                      you are, the fewer questions you&apos;ll get asked.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOptional((v) => !v)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    {showOptional ? "Hide" : "Add"} optional detail
                  </button>

                  {showOptional && (
                    <div className="space-y-4 rounded-md border border-border bg-card/50 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="audience"
                            className="text-muted-foreground text-sm font-medium"
                          >
                            Audience or users
                          </Label>
                          <Input
                            id="audience"
                            value={intake.audience}
                            onChange={(e) =>
                              setField("audience", e.target.value)
                            }
                            placeholder="AEs and inbound prospects"
                            className="bg-card border-input text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="outcome"
                            className="text-muted-foreground text-sm font-medium"
                          >
                            Desired outcome
                          </Label>
                          <Input
                            id="outcome"
                            value={intake.outcome}
                            onChange={(e) =>
                              setField("outcome", e.target.value)
                            }
                            placeholder="Cut time-to-meeting from days to minutes"
                            className="bg-card border-input text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="target-date"
                            className="text-muted-foreground text-sm font-medium"
                          >
                            Target date
                          </Label>
                          <Input
                            id="target-date"
                            value={intake.targetDate}
                            onChange={(e) =>
                              setField("targetDate", e.target.value)
                            }
                            placeholder="End of Q3"
                            className="bg-card border-input text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="team"
                            className="text-muted-foreground text-sm font-medium"
                          >
                            Requesting team
                          </Label>
                          <Input
                            id="team"
                            value={intake.requestingTeam}
                            onChange={(e) =>
                              setField("requestingTeam", e.target.value)
                            }
                            placeholder="Marketing Ops"
                            className="bg-card border-input text-foreground"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="constraints"
                          className="text-muted-foreground text-sm font-medium"
                        >
                          Known constraints
                        </Label>
                        <Textarea
                          id="constraints"
                          value={intake.constraints}
                          onChange={(e) =>
                            setField("constraints", e.target.value)
                          }
                          placeholder="Must use Google Calendar. No new vendor contracts. Has to work on mobile."
                          rows={2}
                          className="bg-card border-input text-foreground placeholder:text-muted-foreground resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="links"
                          className="text-muted-foreground text-sm font-medium"
                        >
                          Reference links
                        </Label>
                        <Textarea
                          id="links"
                          value={intake.links}
                          onChange={(e) => setField("links", e.target.value)}
                          placeholder="Competitor example, an existing doc, a design file"
                          rows={2}
                          className="bg-card border-input text-foreground placeholder:text-muted-foreground resize-none"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white h-12 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isScreening ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Checking your request...
                      </>
                    ) : isStreaming ? (
                      <>
                        <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                        Writing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate PRD
                      </>
                    )}
                  </Button>

                  {sections.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-muted-foreground text-sm font-medium">
                        You&apos;ll get {sections.length} sections
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {sections.map((section) => (
                          <span
                            key={section.title}
                            className="text-xs px-2 py-1 rounded-md border border-border bg-card/50 text-muted-foreground"
                          >
                            {section.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-900 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* --------------------------------------------------- Right column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between h-9">
                <Label className="text-muted-foreground text-sm font-medium">
                  {isStreaming ? "Writing your PRD..." : "Your PRD"}
                </Label>
                {isStreaming && (
                  <Button
                    onClick={() => abortRef.current?.abort()}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-8"
                  >
                    <StopCircle className="mr-1.5 h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>

              <div
                ref={outputRef}
                className="w-full rounded-md border border-input bg-card/50 p-4 overflow-y-auto h-[520px]"
              >
                {markdown ? (
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
                    {markdown}
                    {isStreaming && (
                      <span className="inline-block w-2 h-3.5 -mb-0.5 bg-[#0070f3] animate-pulse" />
                    )}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">
                      Your PRD will appear here as it&apos;s written.
                    </p>
                    <p className="text-muted-foreground/70 text-xs">
                      Markdown, ready to paste into Notion, Linear, or Docs.
                    </p>
                  </div>
                )}
              </div>

              {markdown && !isStreaming && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleCopy}
                      className="bg-[#0070f3] hover:bg-[#0060df] text-white"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" /> Copy for Notion
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="border-input hover:bg-accent text-foreground"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download .md
                    </Button>
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Paste into Notion and it converts to real headings, lists,
                    and tables. Works the same in Linear and Google Docs.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label
                      htmlFor="refine"
                      className="text-muted-foreground text-sm font-medium"
                    >
                      Refine it
                    </Label>
                    <Textarea
                      id="refine"
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder="Tighten the scope section. Add more detail on how we'd measure success."
                      rows={2}
                      className="bg-card border-input text-foreground placeholder:text-muted-foreground resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRefine}
                        disabled={!refineInstruction.trim()}
                        variant="outline"
                        className="flex-1 border-input hover:bg-accent text-foreground disabled:opacity-50"
                      >
                        <Wand2 className="mr-2 h-4 w-4" /> Apply
                      </Button>
                      {versions.length > 0 && (
                        <Button
                          onClick={handleUndo}
                          variant="outline"
                          className="border-input hover:bg-accent text-foreground"
                          title="Revert the last refinement"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Undo
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      onClick={handleStartOver}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground px-0"
                    >
                      <ArrowLeft className="mr-1.5 h-4 w-4" /> Start over
                    </Button>
                    {modelUsed && (
                      <span className="text-muted-foreground/60 text-xs font-mono">
                        {modelUsed}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Clarify phase ----------------------------------------------------------

function ClarifyPanel({
  questions,
  answers,
  onChange,
  onBack,
  onSubmit,
  onSkip,
  busy,
}: {
  questions: Question[]
  answers: string[]
  onChange: (index: number, value: string) => void
  onBack: () => void
  onSubmit: () => void
  onSkip: () => void
  busy: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-md border border-border bg-card/50">
        <HelpCircle className="h-5 w-5 text-[#0070f3] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-foreground text-sm font-medium">
            A few things would make this PRD much better
          </p>
          <p className="text-muted-foreground text-xs">
            Answer what you can. Anything you skip becomes an open question in
            the document rather than a guess.
          </p>
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={i} className="space-y-2">
          <Label
            htmlFor={`answer-${i}`}
            className="text-foreground text-sm font-medium"
          >
            {q.question}
          </Label>
          <p className="text-muted-foreground text-xs">{q.why}</p>
          <Textarea
            id={`answer-${i}`}
            value={answers[i] ?? ""}
            onChange={(e) => onChange(i, e.target.value)}
            rows={3}
            className="bg-card border-input text-foreground placeholder:text-muted-foreground resize-none"
          />
        </div>
      ))}

      <div className="space-y-2">
        <Button
          onClick={onSubmit}
          disabled={busy}
          className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white h-12 text-base font-medium disabled:opacity-50"
        >
          {busy ? (
            <>
              <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
              Writing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate PRD
            </>
          )}
        </Button>
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            disabled={busy}
            className="text-muted-foreground hover:text-foreground px-0"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Edit request
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            size="sm"
            disabled={busy}
            className="text-muted-foreground hover:text-foreground px-0"
          >
            Skip and draft anyway
          </Button>
        </div>
      </div>
    </div>
  )
}
