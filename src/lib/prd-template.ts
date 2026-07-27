import { VERCEL_WRITING_RULES_BRIEF } from "@/lib/vercel-style-guide"

/**
 * The PRD template, as config.
 *
 * Two families share one engine: marketing requests (campaigns, pages, emails)
 * and app/product requests (new tools, features, integrations). A request type
 * picks a family and adds its own sections on top. Adding a type is a config
 * entry, not new code.
 */

export const PRD_MODELS = {
  /** Cheap classification: is there enough context to draft from? */
  triage: "anthropic/claude-haiku-4-5",
  /** Long-form drafting. Output quality here gates the whole tool. */
  draft: "anthropic/claude-opus-5",
  /** Proven through the gateway in this repo, if the primary is unavailable. */
  draftFallback: "anthropic/claude-sonnet-4-6",
} as const

// --- Sections ---------------------------------------------------------------

export interface Section {
  title: string
  /** What belongs in the section. Goes into the prompt verbatim. */
  guidance: string
}

const MARKETING_SECTIONS: Section[] = [
  {
    title: "Summary",
    guidance:
      "Two or three sentences: what is being asked for, and why now. Someone should be able to read only this and know whether the request concerns them.",
  },
  {
    title: "Background & context",
    guidance:
      "What prompted this request. Prior work, the trigger event, what has already been tried.",
  },
  {
    title: "Objective",
    guidance:
      "The business outcome, not the deliverable. 'Increase partner-sourced pipeline', not 'ship a landing page'. If the requester only described a deliverable, infer the likely outcome and label it as an assumption.",
  },
  {
    title: "Success metrics",
    guidance:
      "Primary metric, target, current baseline, and how it will be measured. If any of these were not provided, write 'TBD — needs input from <role>'. Never invent a number.",
  },
  {
    title: "Target audience",
    guidance:
      "Who this is for: segment, funnel stage, rough size, and where they are today.",
  },
  {
    title: "Scope",
    guidance:
      "Two labelled lists: 'In scope' and 'Explicitly out of scope'. The out-of-scope list is the most valuable part of this document — populate it even if the requester did not mention limits, drawing the obvious adjacent asks that are NOT included.",
  },
  {
    title: "Requirements",
    guidance:
      "Numbered, testable statements of what must exist. Each one should be verifiable as done or not done.",
  },
  {
    title: "Messaging & content direction",
    guidance:
      "Key message, supporting proof points, tone, and the call to action.",
  },
  {
    title: "Channels & deliverables",
    guidance:
      "Every asset needed, by channel, with format and specs where known.",
  },
  {
    title: "Dependencies & inputs needed",
    guidance:
      "Who owes what before this can ship: legal or brand review, a data pull, design, dev, budget approval. Name the role for each.",
  },
  {
    title: "Timeline & milestones",
    guidance:
      "Worked backward from the launch date. If no date was given, say so rather than inventing one.",
  },
  {
    title: "Risks & mitigations",
    guidance: "What could derail this, and the mitigation for each.",
  },
  {
    title: "Stakeholders & approvals",
    guidance:
      "DACI: Driver, Approver, Contributors, Informed. Use roles where names were not given.",
  },
  {
    title: "Open questions & assumptions",
    guidance:
      "Every unknown, as a question addressed to a named role. Every assumption you made while drafting. This section absorbs anything you could not answer — nothing above should be left vague because it landed here.",
  },
]

const PRODUCT_SECTIONS: Section[] = [
  {
    title: "Summary",
    guidance:
      "Two or three sentences: what is being built, for whom, and why now.",
  },
  {
    title: "Problem & context",
    guidance:
      "Who is hurting and how, plus the current workaround. Be concrete about the cost of the status quo.",
  },
  {
    title: "Objective & success criteria",
    guidance:
      "The outcome this should produce, with a metric, a target, and how it will be measured. If those were not provided, write 'TBD — needs input from <role>'. Never invent a number.",
  },
  {
    title: "Users & primary use cases",
    guidance:
      "Each distinct user type, and the job each one is doing. For an internal tool, that may be two or three roles with very different needs.",
  },
  {
    title: "Scope",
    guidance:
      "Two labelled lists: 'In scope for v1' and 'Explicitly out of scope'. Push anything not needed to prove the concept into out of scope, and say which of those are v2 candidates.",
  },
  {
    title: "User stories & acceptance criteria",
    guidance:
      "The core of this document. For each story: 'As a <user>, I want <capability>, so that <outcome>.' Under each, acceptance criteria as Given / When / Then bullets. Cover the unhappy paths too — double booking, cancellation, a timezone mismatch, an expired link. A developer should be able to build and test from these alone.",
  },
  {
    title: "Functional requirements",
    guidance:
      "Numbered, testable statements of system behavior that the user stories do not already cover.",
  },
  {
    title: "Screens & key flows",
    guidance:
      "Screen by screen. For each: purpose, the key elements on it, and its empty, loading, error, and success states. Then the primary end-to-end flow as a numbered sequence.",
  },
  {
    title: "Data model",
    guidance:
      "Each entity with its fields, types, and relationships. Note required versus optional, and anything that needs to be unique. A table per entity works well here.",
  },
  {
    title: "Integrations & external services",
    guidance:
      "Every external system: auth provider, calendar API, email or SMS, payments, analytics. For each, what it is used for and what data crosses the boundary.",
  },
  {
    title: "Non-functional requirements",
    guidance:
      "Authentication and permissions (who can see and do what), performance expectations, accessibility, mobile and responsive behavior, and any data retention or privacy constraint.",
  },
  {
    title: "Technical constraints & preferences",
    guidance:
      "Required or preferred stack, hosting, and existing systems it must fit. Also what NOT to use. If the requester stated no preference, say so — do not silently pick for them.",
  },
  {
    title: "Risks & open questions",
    guidance:
      "Technical and product risks with mitigations, plus every unknown as a question addressed to a named role.",
  },
  {
    title: "Milestones & phasing",
    guidance:
      "v1 as the smallest thing that proves the concept, then what follows. Include a target date only if one was given.",
  },
  {
    title: "Stakeholders & approvals",
    guidance:
      "Who requested it, who decides it is done, who contributes, who needs to be told. Use roles where names were not given.",
  },
]

export const TEMPLATE_FAMILIES = {
  marketing: { label: "Marketing request", sections: MARKETING_SECTIONS },
  product: { label: "App / product request", sections: PRODUCT_SECTIONS },
} as const

export type FamilyId = keyof typeof TEMPLATE_FAMILIES

// --- Request types ----------------------------------------------------------

export interface RequestType {
  id: string
  label: string
  family: FamilyId
  /** Type-specific emphasis for the drafting model. */
  guidance: string
  /** Sections appended after the family's base set. */
  extraSections: Section[]
  /** Shown in the intake form as the brain-dump placeholder. */
  placeholder: string
}

export const REQUEST_TYPES: RequestType[] = [
  {
    id: "app",
    label: "New app or tool",
    family: "product",
    guidance:
      "A net-new application. Be explicit about the accounts model and the first-run experience, since those are the details requesters most often leave out.",
    extraSections: [
      {
        title: "Accounts & auth model",
        guidance:
          "Who has an account, how they sign in, what roles exist, and whether anything is accessible without signing in.",
      },
      {
        title: "Onboarding flow",
        guidance:
          "What a brand-new user does between first arrival and first success. Name the first-run empty state.",
      },
    ],
    placeholder:
      "Example: We need a meeting booking app so prospects can self-schedule with our AEs instead of emailing back and forth. AEs connect their Google Calendar, set weekly availability, and get a shareable link. Prospects pick a slot, enter their name, email and company, and both sides get a calendar invite and a confirmation email.",
  },
  {
    id: "feature",
    label: "Feature in an existing app",
    family: "product",
    guidance:
      "An addition to something already running. Describe current behavior before new behavior, and be explicit about existing users and data.",
    extraSections: [
      {
        title: "Current behavior",
        guidance:
          "How it works today, precisely enough that the delta is unambiguous.",
      },
      {
        title: "Migration & backfill",
        guidance:
          "What happens to existing records, and whether a backfill or migration is needed.",
      },
      {
        title: "Impact on existing users",
        guidance:
          "What changes for people already using this, whether anything breaks, and what they need to be told.",
      },
    ],
    placeholder:
      "Example: Add saved views to the campaign dashboard. Today everyone re-applies the same filters every morning. Users should be able to name a filter set, pin it, and share it with their team.",
  },
  {
    id: "integration",
    label: "Integration or automation",
    family: "product",
    guidance:
      "Systems talking to each other. Direction of data flow and failure behavior matter more than UI here.",
    extraSections: [
      {
        title: "Trigger & schedule",
        guidance:
          "What starts it: a user action, a webhook, or a schedule. If scheduled, how often and in which timezone.",
      },
      {
        title: "Systems & data flow",
        guidance:
          "Each system, the direction data moves, the fields mapped, and which side is the source of truth.",
      },
      {
        title: "Failure & retry behavior",
        guidance:
          "What happens on a failed sync: retries, alerting, and whether partial success is acceptable.",
      },
    ],
    placeholder:
      "Example: Sync form fills from our landing pages into Salesforce as leads, with UTM parameters mapped to campaign fields. Should be near real time and must not create duplicates for known contacts.",
  },
  {
    id: "campaign",
    label: "Campaign",
    family: "marketing",
    guidance:
      "A multi-channel push. Be concrete about the offer and how spend is allocated.",
    extraSections: [
      {
        title: "Budget & spend",
        guidance: "Total budget and allocation by channel, if provided.",
      },
      {
        title: "Offer & CTA",
        guidance:
          "The specific offer, the action being asked for, and where it lands.",
      },
    ],
    placeholder:
      "Example: Q3 push to get more partner-sourced pipeline. Email to our partner list, a co-branded landing page, and paid social. Aimed at platform engineering leads at mid-market companies already using a competitor.",
  },
  {
    id: "launch",
    label: "Product launch / GTM",
    family: "marketing",
    guidance:
      "A launch. Positioning and enablement carry the most weight; be explicit about launch tier.",
    extraSections: [
      {
        title: "Positioning & differentiation",
        guidance:
          "What this is, who it is for, and why it wins against the alternative including doing nothing.",
      },
      {
        title: "Launch tier",
        guidance:
          "The tier and what that entails, from a changelog entry through to a full moment.",
      },
      {
        title: "Enablement needs",
        guidance:
          "What sales, support, and partners need before launch day: talk tracks, docs, demo, FAQ, pricing guidance.",
      },
    ],
    placeholder:
      "Example: Launching the new observability dashboard in six weeks. Needs a blog post, docs, changelog, a demo video, and a sales one-pager. Aimed at existing Pro customers first.",
  },
  {
    id: "email",
    label: "Email / lifecycle",
    family: "marketing",
    guidance:
      "Email or a lifecycle program. Segmentation, suppression, and compliance are where these go wrong.",
    extraSections: [
      {
        title: "Segment & suppression logic",
        guidance:
          "Exactly who receives this and who must be excluded, as stated criteria.",
      },
      {
        title: "Send schedule & cadence",
        guidance:
          "Dates, times, timezone handling, and the sequence if there is more than one send.",
      },
      {
        title: "Deliverability & compliance",
        guidance:
          "Unsubscribe and preference handling, consent basis, and any regional requirement.",
      },
    ],
    placeholder:
      "Example: Three-email onboarding sequence for new self-serve signups who have not deployed yet. Goal is a first deploy within seven days. Should stop sending as soon as they deploy.",
  },
  {
    id: "web",
    label: "Web page or landing page",
    family: "marketing",
    guidance:
      "A page. URL, information architecture placement, SEO, and tracking are the details most often missing.",
    extraSections: [
      {
        title: "URL & IA placement",
        guidance:
          "The proposed URL, where it sits in navigation, and what links to it.",
      },
      {
        title: "SEO",
        guidance:
          "Target keywords, title and meta description direction, and any redirect needed.",
      },
      {
        title: "Tracking & UTM plan",
        guidance:
          "Conversion events to instrument and the UTM convention for inbound links.",
      },
    ],
    placeholder:
      "Example: Landing page for the AI Accelerate event. Needs registration, agenda, speakers, and a post-event state that swaps in the recording.",
  },
  {
    id: "event",
    label: "Event or webinar",
    family: "marketing",
    guidance:
      "An event. Logistics and the follow-up motion matter as much as promotion — most of the value is in what happens after.",
    extraSections: [
      {
        title: "Logistics",
        guidance:
          "Venue or platform, date and time with timezone, capacity, and run of show.",
      },
      {
        title: "Registration & promotion",
        guidance:
          "Registration flow, promotional channels and timing, and reminder sends.",
      },
      {
        title: "Follow-up motion",
        guidance:
          "What happens to attendees and to no-shows, who follows up, and by when.",
      },
    ],
    placeholder:
      "Example: Technical webinar on shipping AI apps, aimed at platform teams. Want 500 registrations and 40% attendance. Recording becomes gated content afterward.",
  },
  {
    id: "content",
    label: "Content asset",
    family: "marketing",
    guidance:
      "A content piece. Be explicit about format, the review path, and how it gets distributed — an asset nobody sees is the common failure.",
    extraSections: [
      {
        title: "Format & length",
        guidance: "Format, target length, and any structural requirement.",
      },
      {
        title: "Distribution & SEO",
        guidance:
          "Where it will be published and promoted, and target keywords if it is search-driven.",
      },
      {
        title: "Subject-matter experts & review path",
        guidance:
          "Who provides the substance, who reviews for technical accuracy, and who approves.",
      },
    ],
    placeholder:
      "Example: Technical blog post on cutting build times, co-written with an engineer from the platform team. Should include real numbers from our own migration.",
  },
]

export function getRequestType(id: string): RequestType | undefined {
  return REQUEST_TYPES.find((t) => t.id === id)
}

/** The full ordered section list for a request type. */
export function sectionsFor(typeId: string): Section[] {
  const type = getRequestType(typeId)
  if (!type) return []
  return [...TEMPLATE_FAMILIES[type.family].sections, ...type.extraSections]
}

// --- Destinations -----------------------------------------------------------

export interface Destination {
  id: string
  label: string
  /** How the draft should shift for this reader. */
  guidance: string
}

export const PRD_DESTINATIONS: Destination[] = [
  {
    id: "agent",
    label: "AI coding agent (Claude Code, v0, Cursor)",
    guidance:
      "The reader is a coding agent that will build directly from this document, with no chance to ask a follow-up question. Optimize for buildability over readability: maximize acceptance criteria, the data model, explicit UI states, and edge cases. Minimize narrative prose, background, and anything about stakeholders or process. Be decisive and unambiguous — where a detail is genuinely undecided, state a specific recommended default and mark it as a decision the human should confirm, rather than leaving it open. Prefer tables and lists over paragraphs. Name concrete field types, routes, and states.",
  },
  {
    id: "engineering",
    label: "Engineering team",
    guidance:
      "The reader is an engineer who can ask questions but would rather not. Emphasize requirements, acceptance criteria, data, integrations, and non-functional constraints. Keep marketing framing brief.",
  },
  {
    id: "design",
    label: "Design",
    guidance:
      "The reader is a designer. Emphasize the user, the jobs to be done, flows, states, and content hierarchy. Describe outcomes and constraints rather than prescribing visual solutions.",
  },
  {
    id: "content",
    label: "Content & copy",
    guidance:
      "The reader is a writer. Emphasize audience, key message, proof points, tone, calls to action, and word-count or format constraints.",
  },
  {
    id: "ops",
    label: "Marketing Ops / lifecycle",
    guidance:
      "The reader runs the systems. Emphasize segmentation, suppression, data fields, tracking and UTM conventions, timing, and compliance. Be precise about anything that touches the CRM or ESP.",
  },
  {
    id: "leadership",
    label: "Cross-functional / leadership",
    guidance:
      "The reader is deciding whether to fund this. Lead with objective, success metrics, scope, and cost. Keep implementation detail short. Make the decision being asked for explicit.",
  },
]

export function getDestination(id: string): Destination | undefined {
  return PRD_DESTINATIONS.find((d) => d.id === id)
}

// --- Markdown constraints ---------------------------------------------------

/**
 * Notion turns pasted markdown into native blocks, but only for the subset it
 * parses. Staying inside this subset is what makes "Copy for Notion" land as
 * real headings and lists rather than literal ## and **.
 */
export const MARKDOWN_RULES = `
OUTPUT FORMAT — this document gets pasted directly into Notion, so stay inside the markdown Notion parses:

USE:
- "# Title" once at the top, then "## " for each section and "### " for sub-headings
- "- " for bullets, "1. " for numbered lists
- "**bold**" for emphasis and for inline labels
- Pipe tables with a header separator row, for data models and structured lists
- Fenced code blocks with a language tag, for schemas or examples

DO NOT USE:
- Raw HTML of any kind
- Horizontal rules ("---" or "***")
- Footnotes, definition lists, or task-list checkboxes
- List nesting deeper than two levels
- Emoji
- A leading or trailing code fence around the whole document — output the markdown itself, not a fenced block containing it

Start immediately with the "# " title line. No preamble, no "Here is the PRD", no commentary after the final section.
`

// --- Intake -----------------------------------------------------------------

export interface PrdIntake {
  requestType: string
  destination: string
  title: string
  brainDump: string
  audience?: string
  outcome?: string
  targetDate?: string
  requestingTeam?: string
  constraints?: string
  links?: string
}

export interface ClarifyingAnswer {
  question: string
  answer: string
}

/** Renders intake into the labelled block both prompts read from. */
export function formatIntake(
  intake: PrdIntake,
  answers: ClarifyingAnswer[] = []
): string {
  const type = getRequestType(intake.requestType)
  const destination = getDestination(intake.destination)

  const rows: [string, string | undefined][] = [
    ["Request type", type?.label ?? intake.requestType],
    ["Document is for", destination?.label ?? intake.destination],
    ["Working title", intake.title],
    ["Audience / users", intake.audience],
    ["Desired outcome", intake.outcome],
    ["Target date", intake.targetDate],
    ["Requesting team", intake.requestingTeam],
    ["Known constraints", intake.constraints],
    ["Reference links", intake.links],
  ]

  const fields = rows
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([label, value]) => `${label}: ${value!.trim()}`)
    .join("\n")

  const answered = answers
    .filter((a) => a.answer.trim().length > 0)
    .map((a) => `Q: ${a.question}\nA: ${a.answer.trim()}`)
    .join("\n\n")

  return [
    fields,
    `\nWhat the requester wrote:\n${intake.brainDump.trim()}`,
    answered ? `\nClarifying answers from the requester:\n${answered}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

// --- Prompts ----------------------------------------------------------------

export function buildTriageSystemPrompt(): string {
  return `You screen incoming work requests before a PRD is drafted from them.

Your job is to decide one thing: is there enough real, specific context here to write a PRD that would actually be useful, or would drafting now produce confident-sounding filler?

Mark the request READY when you can infer, from what the requester wrote, all of:
- what they want built or produced
- who it is for
- why it matters, or what outcome it should drive

Mark it NOT READY only when a genuine gap would force you to invent something load-bearing. In that case return one to three questions — never more.

Rules for the questions:
- Ask only about gaps that would materially change the document. Do not ask for detail that belongs in the PRD's own open-questions section.
- Ask about substance, not formatting or preferences.
- Make each question answerable in a sentence or two. No compound questions.
- Be specific. "Who are the two or three user roles, and what can each of them do?" beats "Can you tell me more about the users?"
- Never ask something the requester already answered in the fields or their description.

Bias toward READY. A requester who wrote several specific sentences should not be interrogated. Questions are for requests that are genuinely too thin to draft from.

For each question, also give a short reason explaining what you would otherwise have to guess.`
}

export type DraftMode = "draft" | "refine"

export function buildDraftSystemPrompt(
  typeId: string,
  destinationId: string,
  mode: DraftMode
): string {
  const type = getRequestType(typeId)
  const destination = getDestination(destinationId)
  const sections = sectionsFor(typeId)

  const sectionSpec = sections
    .map((s, i) => `${i + 1}. ## ${s.title}\n   ${s.guidance}`)
    .join("\n")

  const shared = `You write product requirements documents from rough requests. The requester is a marketer or an internal stakeholder, not a product manager — they describe what they want in a few sentences and you turn it into a document their team can execute against.

${VERCEL_WRITING_RULES_BRIEF}

REQUEST TYPE: ${type?.label ?? typeId}
${type?.guidance ?? ""}

WHO THIS DOCUMENT IS FOR: ${destination?.label ?? destinationId}
${destination?.guidance ?? ""}

REQUIRED SECTIONS — every one of these, in this order, using the exact "## " heading text given:

${sectionSpec}

HARD RULES:
1. Never leave a section empty and never write "N/A" or "To be determined" as a whole section. If the requester gave you nothing for a section, write what you can infer, label the inference as an assumption, and put the specific unknown in the open-questions section as a question addressed to a role.
2. Never invent a metric, target, budget, headcount, or date. If a number was not provided, write "TBD — needs input from <role>". A fabricated number inside an authoritative document is worse than an admitted gap.
3. Do not output an empty skeleton. Every section gets real content — inferred and labelled where necessary, but never a placeholder.
4. Distinguish what the requester said from what you inferred. Mark inferences with "**Assumption:**" so a reviewer can check them.
5. Populate the out-of-scope list even when the requester mentioned no limits. Name the obvious adjacent asks this does NOT include. This is the section that saves the most time later.
6. Be concrete. Prefer a named role over "the team", a specific field name over "user data", a stated behavior over "handle appropriately".

${MARKDOWN_RULES}`

  if (mode === "refine") {
    return `${shared}

YOU ARE REVISING AN EXISTING DOCUMENT.

You will receive the current PRD and a revision instruction. Apply the instruction and return the complete revised document.

- Change only what the instruction asks for. Leave every other section byte-for-byte as it was.
- Keep all section headings and their order intact.
- If the instruction asks for something that would require a fact you do not have, make the structural change and add the missing fact to the open-questions section rather than inventing it.
- If the instruction is ambiguous, apply the most conservative reading and note what you took it to mean in the open-questions section.
- Return the full document, not a diff and not a summary of your changes.`
  }

  return shared
}
