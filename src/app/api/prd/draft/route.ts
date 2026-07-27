import { NextRequest, NextResponse } from "next/server"
import { streamText } from "ai"
import {
  PRD_MODELS,
  buildDraftSystemPrompt,
  formatIntake,
  getRequestType,
  type ClarifyingAnswer,
  type DraftMode,
  type PrdIntake,
} from "@/lib/prd-template"

interface DraftRequest {
  mode?: DraftMode
  intake: PrdIntake
  answers?: ClarifyingAnswer[]
  /** Required when mode is "refine": the document being revised. */
  currentMarkdown?: string
  /** Required when mode is "refine": what to change. */
  instruction?: string
}

/**
 * streamText resolves before the model is actually reached, so wrapping it in a
 * try/catch catches nothing — a rejected model id surfaces only once the stream
 * is consumed, by which point the response is already committed and a fallback
 * is impossible. Pulling the first chunk here forces the error to surface while
 * we can still retry on another model. The chunk is handed back so it can be
 * replayed into the response body rather than dropped.
 */
async function startStream(
  model: string,
  system: string,
  prompt: string
): Promise<{
  iterator: AsyncIterator<string>
  first: IteratorResult<string>
}> {
  const result = streamText({
    model,
    system,
    prompt,
    // Opus 5 thinks by default and this ceiling covers thinking plus prose, so
    // it needs real headroom or a long PRD truncates mid-section.
    maxOutputTokens: 16000,
  })

  const iterator = result.textStream[Symbol.asyncIterator]()
  const first = await iterator.next()
  return { iterator, first }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DraftRequest
    const mode: DraftMode = body.mode === "refine" ? "refine" : "draft"
    const intake = body.intake

    if (!intake?.requestType || !getRequestType(intake.requestType)) {
      return NextResponse.json(
        { error: "A valid request type is required" },
        { status: 400 }
      )
    }

    if (!intake.brainDump?.trim()) {
      return NextResponse.json(
        { error: "Describe what you need before generating" },
        { status: 400 }
      )
    }

    if (mode === "refine" && !body.currentMarkdown?.trim()) {
      return NextResponse.json(
        { error: "There is no draft to refine yet" },
        { status: 400 }
      )
    }

    if (mode === "refine" && !body.instruction?.trim()) {
      return NextResponse.json(
        { error: "Describe what you want changed" },
        { status: 400 }
      )
    }

    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        {
          error:
            "AI Gateway not configured. Please add AI_GATEWAY_API_KEY to your environment variables.",
        },
        { status: 500 }
      )
    }

    const system = buildDraftSystemPrompt(
      intake.requestType,
      intake.destination,
      mode
    )

    const context = formatIntake(intake, body.answers ?? [])

    const prompt =
      mode === "refine"
        ? `Original request context:\n${context}\n\nCurrent PRD:\n${body.currentMarkdown!.trim()}\n\nRevision instruction:\n${body.instruction!.trim()}`
        : context

    let started: Awaited<ReturnType<typeof startStream>>
    let usedModel: string = PRD_MODELS.draft

    try {
      started = await startStream(PRD_MODELS.draft, system, prompt)
    } catch (primaryError) {
      console.log(
        `PRD draft model ${PRD_MODELS.draft} failed, falling back to ${PRD_MODELS.draftFallback}:`,
        primaryError
      )
      started = await startStream(PRD_MODELS.draftFallback, system, prompt)
      usedModel = PRD_MODELS.draftFallback
    }

    console.log(`PRD ${mode} streaming from model: ${usedModel}`)

    const { iterator, first } = started
    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!first.done && first.value) {
            controller.enqueue(encoder.encode(first.value))
          }
          if (!first.done) {
            while (true) {
              const next = await iterator.next()
              if (next.done) break
              if (next.value) controller.enqueue(encoder.encode(next.value))
            }
          }
          controller.close()
        } catch (streamError) {
          console.error("Error while streaming PRD draft:", streamError)
          controller.error(streamError)
        }
      },
      async cancel() {
        // The client aborted; stop pulling from the model.
        await iterator.return?.()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Prd-Model": usedModel,
      },
    })
  } catch (error) {
    console.error("Error in prd/draft API:", error)
    return NextResponse.json(
      { error: "Could not generate the PRD. Please try again." },
      { status: 500 }
    )
  }
}
