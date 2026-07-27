import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import {
  PRD_MODELS,
  buildTriageSystemPrompt,
  formatIntake,
  getRequestType,
  type PrdIntake,
} from "@/lib/prd-template"

const TriageSchema = z.object({
  ready: z
    .boolean()
    .describe(
      "True when there is enough specific context to draft a useful PRD."
    ),
  questions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("A single specific question, answerable in a sentence."),
        why: z
          .string()
          .describe("What you would otherwise have to guess. One short line."),
      })
    )
    .max(3)
    .describe("Empty when ready is true. Never more than three."),
})

export async function POST(request: NextRequest) {
  try {
    const intake = (await request.json()) as PrdIntake

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

    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        {
          error:
            "AI Gateway not configured. Please add AI_GATEWAY_API_KEY to your environment variables.",
        },
        { status: 500 }
      )
    }

    const { object } = await generateObject({
      model: PRD_MODELS.triage,
      schema: TriageSchema,
      system: buildTriageSystemPrompt(),
      prompt: formatIntake(intake),
    })

    // Belt and braces: a "not ready" verdict with no questions would strand the
    // user on an empty clarify screen, so treat it as ready.
    const questions = object.ready ? [] : object.questions.slice(0, 3)

    return NextResponse.json({
      ready: object.ready || questions.length === 0,
      questions,
    })
  } catch (error) {
    console.error("Error in prd/clarify API:", error)
    return NextResponse.json(
      { error: "Could not screen the request. Try generating anyway." },
      { status: 500 }
    )
  }
}
