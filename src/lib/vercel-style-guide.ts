/**
 * Vercel brand voice, in two sizes.
 *
 * VERCEL_STYLE_GUIDE is the full guide for tools that produce customer-facing
 * copy. VERCEL_WRITING_RULES_BRIEF is the condensed version for internal
 * documents, where the full copywriting guide would push the output into a
 * marketing register it shouldn't be in.
 */

export const VERCEL_STYLE_GUIDE = `
VERCEL STYLE GUIDE PRINCIPLES:

1. KEEP SENTENCES SHORT
- Write short, declarative sentences
- Every time you use a comma, consider using a period instead
- Remove unnecessary "filler" words
- A great sentence is a good sentence made shorter

2. VARY SENTENCE LENGTH
- Use short sentences for impact
- Use longer sentences to build momentum
- Mix phrasing to avoid sounding robotic

3. WRITE LIKE YOU SPEAK
- Avoid corporate jargon and marketing fluff
- Use simple, shorter words (facilitate → help, utilize → use, commence → start)
- Don't get fancy. Get to the point faster.
- Sentences can start with "but" and "and" (but don't overdo it)

4. BE SPECIFIC AND BENEFIT-DRIVEN
- Back statements with facts or data
- Use "best", "bigger", "better", "faster" only with context (e.g., "6× faster deploys")
- Lead with the benefit, not the feature
- Be precise. Avoid vague claims.
- Examples from Vercel:
  * "One endpoint, all your models" (not "Unified AI gateway")
  * "Helping teams ship 6× faster" (not "Faster deployments")
  * "Fast, scalable, and reliable" (three concrete benefits)

5. BE CONFIDENT BUT CLIPPED
- Avoid phrases like "I think," "maybe," "could" that soften impact
- Be bold, but also humble
- Know the difference between confidence and arrogance
- Keep tone professional and matter-of-fact

6. HIGHLIGHT CUSTOMERS & COMMUNITY
- Feature customer thoughts and words
- Use customer quotes to show value versus telling
- Let customers do the talking

7. SAY "YOU" MORE THAN "WE"
- Make it about the reader, not us
- Less "we did" and more "you can"
- Empathize with their challenges

8. USE ACTIVE VOICE
- Active voice is more interesting and direct
- Avoid passive constructions with "has", "was", "by", or words ending in "-ed"
- Test: If adding "...by monkeys" makes sense, you're using passive voice

9. USE POSITIVE PHRASING
- Say what something IS rather than what it ISN'T
- Positive tone is uplifting and enabling
- Swap confrontational conjunctions for positive ones

10. NEVER USE EXCLAMATION POINTS
- Vercel does not use exclamation points in company messaging
- Ever. Period. No exceptions.
- Keep tone calm, confident, and factual
- Let the substance of your message create impact, not punctuation
- Replace excitement with clear, concrete benefits

11. MAKE IT SCANNABLE
- Use bullet points and lists liberally
- Break long paragraphs into shorter ones
- Lead with the most important information
- Use clear hierarchies (headers, subheaders)
- One idea per paragraph

12. ACTION-ORIENTED LANGUAGE
- Start with strong verbs: Build, Deploy, Scale, Protect, Monitor
- Examples from Vercel docs:
  * "Deploy at the speed of AI" (not "AI-powered deployments")
  * "Automate away repetition" (not "Automation tools")
  * "Extend and automate workflows" (not "Workflow extensions")
- Make the reader the hero doing the action

13. TECHNICAL PRECISION WITHOUT JARGON
- Use technical terms when they're the clearest option
- Define or contextualize complex concepts immediately
- Avoid buzzwords and marketing speak
- Examples from Vercel:
  * "Fluid compute, active CPU, and provisioned memory" (specific, not "powerful infrastructure")
  * "Incremental Static Regeneration" (precise term, then explain what it does)

14. STRIP QUALIFIERS AND HEDGING
- Remove: "basically", "essentially", "probably", "might", "should"
- Vercel states facts directly
- Wrong: "This will basically help you deploy faster"
- Right: "Deploy 6× faster"

15. COLON CLARITY
- Vercel uses colons to connect concepts clearly
- Format: "Thing: What it does"
- Examples:
  * "Bot Management: Scalable bot protection"
  * "Functions: API routes with Fluid compute"
  * "Draft Mode: View your unpublished CMS content"
`

/**
 * The internal-document register. Same voice, none of the copywriting pressure —
 * a PRD should read like a clear brief, not like a landing page.
 */
export const VERCEL_WRITING_RULES_BRIEF = `
WRITING STYLE:
- Short, declarative sentences. Prefer a period over a comma.
- Active voice. "The requester picks a date", not "a date will be picked".
- Say "you" more than "we". Plain words over jargon (use, not utilize).
- Be specific. Name the number, the system, the person, the date. Never write a vague claim.
- Strip hedging: no "basically", "essentially", "probably", "might", "should".
- Never use exclamation points.
- Make it scannable: bullets over paragraphs, one idea per line, most important thing first.
`
