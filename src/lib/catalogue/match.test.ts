import { test } from "node:test"
import assert from "node:assert/strict"
import {
  matchAnchors,
  normalizeUrl,
  pathKey,
  hasLiquid,
  decodeEntities,
  isUntrackable,
  resolveCioLink,
} from "./match"

const link = (href: string) => ({ href })

// =============================================================================
// Normalization
// =============================================================================

test("normalizeUrl strips tracking params but keeps meaningful ones", () => {
  assert.equal(
    normalizeUrl("https://vercel.com/blog?utm_source=cio&utm_campaign=q3&ref=nav"),
    "https://vercel.com/blog?ref=nav",
  )
})

test("normalizeUrl is order-insensitive for remaining params", () => {
  assert.equal(normalizeUrl("https://a.com/x?b=2&a=1"), normalizeUrl("https://a.com/x?a=1&b=2"))
})

test("normalizeUrl folds scheme/host case, trailing slash, and hash", () => {
  assert.equal(normalizeUrl("HTTPS://VERCEL.COM/Docs/#intro"), "https://vercel.com/Docs")
})

test("normalizeUrl preserves path case, which can be significant", () => {
  assert.notEqual(normalizeUrl("https://a.com/Docs"), normalizeUrl("https://a.com/docs"))
})

test("normalizeUrl rejects non-web and anchor-only hrefs", () => {
  for (const href of ["mailto:hi@vercel.com", "tel:+15551234", "#top", "javascript:void(0)"]) {
    assert.equal(normalizeUrl(href), null, href)
  }
})

test("decodeEntities unescapes ampersands in query strings", () => {
  assert.equal(decodeEntities("https://a.com/x?a=1&amp;b=2"), "https://a.com/x?a=1&b=2")
})

test("pathKey folds www but normalizeUrl does not", () => {
  assert.equal(pathKey("https://www.vercel.com/blog/"), "vercel.com/blog")
  assert.notEqual(normalizeUrl("https://www.vercel.com/blog"), normalizeUrl("https://vercel.com/blog"))
})

test("hasLiquid detects both tag styles", () => {
  assert.ok(hasLiquid("https://a.com/{{customer.id}}"))
  assert.ok(hasLiquid("{% if x %}https://a.com{% endif %}"))
  assert.ok(!hasLiquid("https://a.com/plain"))
})

// =============================================================================
// Matching tiers
// =============================================================================

test("exact match wins and is reported as exact", () => {
  const report = matchAnchors(["https://vercel.com/x"], [link("https://vercel.com/x")])
  assert.equal(report.anchors[0].linkIndex, 0)
  assert.equal(report.anchors[0].tier, "exact")
})

test("entity-escaped anchor matches the clean reported href", () => {
  const report = matchAnchors(["https://a.com/x?a=1&amp;b=2"], [link("https://a.com/x?a=1&b=2")])
  assert.equal(report.anchors[0].tier, "exact")
})

test("differing UTMs still match at the normalized tier", () => {
  const report = matchAnchors(
    ["https://vercel.com/blog?utm_source=email"],
    [link("https://vercel.com/blog?utm_source=cio&utm_medium=email")],
  )
  assert.equal(report.anchors[0].linkIndex, 0)
  assert.equal(report.anchors[0].tier, "normalized")
})

test("query-string differences fall back to the path tier", () => {
  const report = matchAnchors(["https://vercel.com/pricing?plan=pro"], [link("https://www.vercel.com/pricing")])
  assert.equal(report.anchors[0].linkIndex, 0)
  assert.equal(report.anchors[0].tier, "path")
})

test("genuinely different destinations do not match", () => {
  const report = matchAnchors(["https://vercel.com/a"], [link("https://vercel.com/b")])
  assert.equal(report.anchors[0].linkIndex, null)
  assert.equal(report.anchors[0].tier, null)
})

// =============================================================================
// The two honesty rules
// =============================================================================

test("ambiguity is reported, never resolved by guessing", () => {
  // Two tracked links differing only by query string: the path tier would map
  // this anchor to both, so it must map to neither.
  const report = matchAnchors(
    ["https://vercel.com/docs?x=9"],
    [link("https://vercel.com/docs?a=1"), link("https://vercel.com/docs?b=2")],
  )
  assert.equal(report.anchors[0].linkIndex, null)
  assert.ok(report.anchors[0].ambiguous)
})

test("an exact match is still taken even when looser tiers would collide", () => {
  const report = matchAnchors(
    ["https://vercel.com/docs?a=1"],
    [link("https://vercel.com/docs?a=1"), link("https://vercel.com/docs?b=2")],
  )
  assert.equal(report.anchors[0].linkIndex, 0)
  assert.equal(report.anchors[0].tier, "exact")
})

test("Liquid hrefs are flagged templated and never matched", () => {
  const report = matchAnchors(
    ["https://vercel.com/{{customer.plan}}"],
    [link("https://vercel.com/pro")],
  )
  assert.equal(report.anchors[0].linkIndex, null)
  assert.ok(report.anchors[0].templated)
  assert.ok(!report.anchors[0].ambiguous)
})

// =============================================================================
// Shared destinations and unmatched links
// =============================================================================

test("anchors sharing one destination are counted, so clicks are not double-claimed", () => {
  // The hero image and the CTA button below it point at the same URL. Customer.io
  // reports one number for both; the viewer has to say so.
  const report = matchAnchors(
    ["https://vercel.com/signup", "https://vercel.com/signup"],
    [link("https://vercel.com/signup")],
  )
  assert.equal(report.anchorsPerLink.get(0), 2)
  assert.equal(report.anchors[0].linkIndex, 0)
  assert.equal(report.anchors[1].linkIndex, 0)
})

test("tracked links that no anchor matched are surfaced", () => {
  const report = matchAnchors(
    ["https://vercel.com/a"],
    [link("https://vercel.com/a"), link("https://vercel.com/orphan")],
  )
  assert.deepEqual(report.unmatchedLinkIndices, [1])
})

test("anchor list order is preserved so results can be zipped onto DOM nodes", () => {
  const hrefs = ["https://a.com/1", "https://a.com/2", "https://a.com/3"]
  const report = matchAnchors(hrefs, [link("https://a.com/2")])
  assert.equal(report.anchors.length, 3)
  assert.deepEqual(
    report.anchors.map((a) => a.href),
    hrefs,
  )
  assert.equal(report.anchors[1].linkIndex, 0)
})

test("empty link set yields no matches and no crash", () => {
  const report = matchAnchors(["https://a.com/1"], [])
  assert.equal(report.anchors[0].linkIndex, null)
  assert.deepEqual(report.unmatchedLinkIndices, [])
})

// =============================================================================
// Untrackable links
// =============================================================================

test("isUntrackable covers mail, phone, anchors, and javascript", () => {
  for (const href of ["mailto:a@b.com", "tel:+15551234", "#top", "javascript:void(0)", ""]) {
    assert.ok(isUntrackable(href), href)
  }
  assert.ok(!isUntrackable("https://vercel.com/x"))
})

test("untrackable anchors are flagged separately from unmatched ones", () => {
  const report = matchAnchors(
    ["mailto:support@vercel.com", "https://vercel.com/untracked"],
    [link("https://vercel.com/other")],
  )
  // The mailto is untrackable — expected to have no data.
  assert.ok(report.anchors[0].untrackable)
  assert.ok(!report.anchors[0].ambiguous)
  // The https link genuinely has no tracking, which is a different situation.
  assert.ok(!report.anchors[1].untrackable)
  assert.equal(report.anchors[1].linkIndex, null)
})

test("an untrackable href never consumes a tracked link", () => {
  const report = matchAnchors(["mailto:a@b.com"], [link("mailto:a@b.com")])
  assert.equal(report.anchors[0].linkIndex, null)
  assert.deepEqual(report.unmatchedLinkIndices, [0])
})

// =============================================================================
// Customer.io's cio_link tag
// =============================================================================

test("resolveCioLink extracts the destination and defaults track to true", () => {
  const tag = resolveCioLink("{% cio_link url:https://vercel.com/ship %}")
  assert.equal(tag?.url, "https://vercel.com/ship")
  assert.equal(tag?.track, true)
})

test("resolveCioLink reads track:false and tolerates extra params", () => {
  const tag = resolveCioLink("{% cio_link url:https://vercel.com/reset track:false url_params:true %}")
  assert.equal(tag?.url, "https://vercel.com/reset")
  assert.equal(tag?.track, false)
})

test("resolveCioLink accepts quoted urls even though docs show them unquoted", () => {
  assert.equal(resolveCioLink('{% cio_link url:"https://a.com/x" %}')?.url, "https://a.com/x")
  assert.equal(resolveCioLink("{% cio_link url:'https://a.com/y' %}")?.url, "https://a.com/y")
})

test("resolveCioLink returns null for ordinary hrefs and other Liquid", () => {
  assert.equal(resolveCioLink("https://a.com/x"), null)
  assert.equal(resolveCioLink("{{ customer.url }}"), null)
})

test("a cio_link anchor matches its tracked link instead of going unattributed", () => {
  // The whole point: the destination is stated literally in the tag, so treating
  // it as opaque Liquid would throw away a perfectly matchable link.
  const report = matchAnchors(
    ["{% cio_link url:https://vercel.com/ship %}"],
    [link("https://vercel.com/ship")],
  )
  assert.equal(report.anchors[0].linkIndex, 0)
  assert.ok(!report.anchors[0].templated)
  assert.equal(report.anchors[0].resolvedHref, "https://vercel.com/ship")
})

test("cio_link with UTM drift still matches at the normalized tier", () => {
  const report = matchAnchors(
    ["{% cio_link url:https://vercel.com/blog?utm_source=email %}"],
    [link("https://vercel.com/blog?utm_source=cio")],
  )
  assert.equal(report.anchors[0].linkIndex, 0)
  assert.equal(report.anchors[0].tier, "normalized")
})

test("track:false is reported as deliberate, not as missing tracking", () => {
  const report = matchAnchors(
    ["{% cio_link url:https://vercel.com/reset track:false %}"],
    [link("https://vercel.com/reset")],
  )
  const a = report.anchors[0]
  assert.ok(a.trackingDisabled)
  assert.equal(a.linkIndex, null)
  // Must not be conflated with a matching failure.
  assert.ok(!a.ambiguous)
  assert.ok(!a.templated)
})

test("a cio_link whose url is itself Liquid stays unattributable", () => {
  const report = matchAnchors(
    ["{% cio_link url:https://vercel.com/{{customer.plan}} %}"],
    [link("https://vercel.com/pro")],
  )
  assert.ok(report.anchors[0].templated)
  assert.equal(report.anchors[0].linkIndex, null)
})

test("_cio_id is stripped like other tracking params", () => {
  // Customer.io appends this by default; missing the leading underscore meant
  // matches silently degraded to the path tier.
  assert.equal(
    normalizeUrl("https://vercel.com/x?_cio_id=abc123&ref=nav"),
    "https://vercel.com/x?ref=nav",
  )
  const report = matchAnchors(
    ["https://vercel.com/ship"],
    [link("https://vercel.com/ship?_cio_id=deadbeef")],
  )
  assert.equal(report.anchors[0].tier, "normalized")
})
