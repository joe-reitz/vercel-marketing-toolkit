import { NextRequest, NextResponse } from 'next/server'

const VERCEL_STYLE_GUIDE = `
You are an expert copywriter specializing in Vercel's brand voice and style guide. 

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, contentType, emailContent } = body

    if (!contentType) {
      return NextResponse.json(
        { error: 'Content type is required' },
        { status: 400 }
      )
    }

    if (contentType === 'email' && !emailContent) {
      return NextResponse.json(
        { error: 'Email content fields are required' },
        { status: 400 }
      )
    }

    if (contentType !== 'email' && !content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Build context-specific instructions based on content type
    const contentTypeInstructions: Record<string, string> = {
      email: 'This is email content. Keep it concise, scannable, and action-oriented. Subject lines should be 40-50 characters (punchy and benefit-driven). Preheader should complement the subject (40-130 chars). Body should be brief with clear CTAs.',
      webpage: 'This is webpage copy. Make it scannable with clear hierarchy. Focus on value propositions and calls-to-action.',
      blog: 'This is blog post content. Balance education with engagement. Use subheadings, short paragraphs, and examples.',
      social: 'This is social media content. Be extremely concise. Make every word count. Hook readers immediately.',
      ad: 'This is ad copy. Be punchy and benefit-driven. Clear call-to-action. Use urgency sparingly but effectively.',
      product: 'This is product description. Focus on features becoming benefits. Be specific about what users can do.',
      docs: 'This is documentation. Be clear, precise, and instructional. Use active voice for actions. Break down complex topics.',
    }

    let systemPrompt: string
    let userContent: string
    const isEmail = contentType === 'email'

    if (isEmail) {
      systemPrompt = `${VERCEL_STYLE_GUIDE}

${contentTypeInstructions[contentType] || ''}

You will receive email content in three parts: subject line, preheader, and body.
Rewrite each component following Vercel's style guide. Return a JSON object with:
1. "emailContent": An object with three properties:
   - "subject": Rewritten subject line (aim for 40-50 chars, punchy, benefit-driven)
   - "preheader": Rewritten preheader text (40-130 chars, complements subject)
   - "body": Rewritten email body (concise, scannable, clear CTA)
2. "improvements": An array of 3-5 specific improvements you made across all components (be concise)

Focus on making the content sound like Vercel: confident yet humble, specific, conversational, and action-oriented.`

      userContent = `Subject Line: ${emailContent.subject || '(not provided)'}

Preheader: ${emailContent.preheader || '(not provided)'}

Body:
${emailContent.body || '(not provided)'}`
    } else {
      systemPrompt = `${VERCEL_STYLE_GUIDE}

${contentTypeInstructions[contentType] || ''}

Rewrite the provided content following these guidelines. 

CRITICAL: Return a JSON object with EXACTLY this structure:
{
  "rewrittenContent": "your full rewritten text here as a SINGLE STRING (not structured JSON or nested objects)",
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}

The "rewrittenContent" field MUST contain the complete rewritten text as PLAIN TEXT, preserving the same format (paragraphs, line breaks) as the original. DO NOT structure the content as JSON objects, arrays, or nested fields. Just improve the text according to Vercel's style guide.

Focus on making the content sound like Vercel: confident yet humble, specific, conversational, and action-oriented.`
      
      userContent = content
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // You can change this to gpt-4o, gpt-4-turbo, or claude models
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to analyze content with AI' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)

    console.log('API Response Result:', result)

    if (isEmail) {
      return NextResponse.json({
        emailContent: {
          subject: typeof result.emailContent?.subject === 'string' ? result.emailContent.subject : '',
          preheader: typeof result.emailContent?.preheader === 'string' ? result.emailContent.preheader : '',
          body: typeof result.emailContent?.body === 'string' ? result.emailContent.body : '',
        },
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
      })
    }

    // Ensure rewrittenContent is a string, not an object
    let rewrittenContent = result.rewrittenContent
    if (typeof rewrittenContent !== 'string') {
      // If it's an object, try to extract text from it
      if (typeof rewrittenContent === 'object' && rewrittenContent !== null) {
        rewrittenContent = JSON.stringify(rewrittenContent, null, 2)
      } else {
        rewrittenContent = String(rewrittenContent || '')
      }
    }

    return NextResponse.json({
      rewrittenContent: rewrittenContent,
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
    })

  } catch (error) {
    console.error('Error in analyze-content API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

