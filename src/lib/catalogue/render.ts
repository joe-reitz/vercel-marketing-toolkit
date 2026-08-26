/**
 * Composing the HTML that actually gets rendered.
 *
 * Customer.io stores an email in two parts: a `layout` (the outer `<html>` shell,
 * shared across many emails) and a `body` (this email's own content). The layout
 * carries a `{{ content }}` slot. Rendering `body` alone loses the shell — and
 * with it the width constraints, background, and font stack that make the email
 * look like itself — so the two are always recombined here.
 */

/** Matches Liquid's content slot in either spacing style. */
const CONTENT_SLOT = /\{\{\s*content\s*\}\}/

export interface ComposeInput {
  layout?: string
  body?: string
}

/**
 * Recombine layout and body into one document.
 *
 * Falls back gracefully: a body with no layout is wrapped in a minimal shell so
 * it still renders at a sane width, and a layout with no slot gets the body
 * appended rather than dropped.
 */
export function composeEmailHtml({ layout, body }: ComposeInput): string {
  const content = body ?? ""

  if (!layout) return wrapBareBody(content)

  if (CONTENT_SLOT.test(layout)) {
    // `$` is special in replacement strings; a literal function avoids any
    // `$&`-style sequence inside the email body being interpreted.
    return layout.replace(CONTENT_SLOT, () => content)
  }

  // Layout exists but has no slot — don't silently discard the content.
  if (/<\/body>/i.test(layout)) {
    return layout.replace(/<\/body>/i, () => `${content}</body>`)
  }
  return `${layout}${content}`
}

function wrapBareBody(content: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;">${content}</body>
</html>`
}

/**
 * Strip HTML to plain text for the index's search field.
 *
 * Deliberately crude — it only feeds substring search, so it drops script/style
 * content, collapses whitespace, and leaves Liquid tags in place (searching for a
 * merge tag is a legitimate thing to want).
 */
export function extractSearchText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000)
}
