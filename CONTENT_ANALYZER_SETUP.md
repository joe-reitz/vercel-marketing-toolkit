# Content Analyzer Setup Guide

The Content Analyzer uses AI to rewrite your content following Vercel's style guide. Here's how to set it up:

## Setup Instructions

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you won't be able to see it again)

### 2. Add API Key to Environment Variables

Create a `.env.local` file in the root of your project (if it doesn't exist):

```bash
OPENAI_API_KEY=your_api_key_here
```

**Important:** Never commit your `.env.local` file to version control! It should already be in `.gitignore`.

### 3. Deploy to Vercel

When deploying to Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `OPENAI_API_KEY` with your API key value
4. Redeploy your application

## AI Model Options

The current implementation uses **GPT-4o Mini** (fast and cost-effective).

### Available Models:

- **gpt-4o-mini** (default) - Fast, affordable, great quality (~$0.15/$0.60 per million tokens)
- **gpt-4o** - Highest quality (~$2.50/$10 per million tokens)
- **gpt-4-turbo** - High quality with good speed (~$10/$30 per million tokens)

To change the model, edit `src/app/api/analyze-content/route.ts` and update the `model` parameter:

```typescript
model: 'gpt-4o', // Change this line
```

## Alternative: Using Claude (Anthropic)

Claude 3.5 Sonnet is excellent at following style guidelines. To use it instead:

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `.env.local`: `ANTHROPIC_API_KEY=your_key_here`
3. Update the API route to use Claude's API

### Claude API Example:

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${systemPrompt}\n\n${content}`,
      },
    ],
  }),
})
```

## Cost Estimation

Based on typical marketing content (500 words ≈ 650 tokens):

### Input + Output (~1,300 tokens total per request)

- **GPT-4o Mini**: ~$0.001 per request (1,000 requests = $1)
- **GPT-4o**: ~$0.016 per request (100 requests = $1.60)
- **Claude 3.5 Sonnet**: ~$0.023 per request (100 requests = $2.30)

For a marketing team, GPT-4o Mini provides excellent value while maintaining high quality.

## Features

- ✅ Rewrites content following Vercel's style guide
- ✅ Supports multiple content types (Email, Webpage, Blog, Social, Ad, Product, Docs)
- ✅ Provides specific improvement suggestions
- ✅ Real-time character count
- ✅ One-click copy to clipboard
- ✅ Dark mode Vercel styling

## Style Guide Principles Applied

The AI follows these key principles from Vercel's style guide:

1. **Keep sentences short** - Fewer commas, more periods
2. **Vary sentence length** - Mix short and long for rhythm
3. **Write like you speak** - Avoid jargon and fluff
4. **Be specific** - Use facts and data, not just superlatives
5. **Be confident** - Avoid hedging language
6. **Say "you" more than "we"** - Focus on the reader
7. **Use active voice** - More direct and engaging
8. **Use positive phrasing** - Say what it IS, not what it ISN'T
9. **Exclamation points sparingly** - Treat them like salt

## Troubleshooting

### "OpenAI API key not configured" error
- Make sure `.env.local` exists with `OPENAI_API_KEY`
- Restart your development server after adding the key
- On Vercel, ensure the environment variable is set in project settings

### Rate limiting
- OpenAI has rate limits based on your tier
- Consider implementing caching or request throttling for production use

### Cost concerns
- Start with GPT-4o Mini for development
- Monitor usage in OpenAI dashboard
- Set up billing alerts

## Security Best Practices

1. Never expose API keys in client-side code
2. Always use environment variables
3. Consider adding rate limiting to the API route
4. Monitor API usage regularly
5. Rotate API keys periodically

