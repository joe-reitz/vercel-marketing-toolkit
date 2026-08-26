import { test } from "node:test"
import assert from "node:assert/strict"
import { heatStyle, luminanceOf, DARK_GROUND_THRESHOLD } from "./heat"
import { clicksFor, DEFAULT_BASIS, type CatalogueLink } from "./types"

const link: CatalogueLink = {
  href: "https://vercel.com/x",
  unique: { all: 120, human: 100, machine: 20 },
  raw: { all: 180, human: 140, machine: 40 },
}

// =============================================================================
// Click basis
// =============================================================================

test("the default basis is unique human clicks", () => {
  assert.deepEqual(DEFAULT_BASIS, { dedupe: "unique", audience: "human" })
  assert.equal(clicksFor(link, DEFAULT_BASIS), 100)
})

test("every basis reads a distinct number from the same stored link", () => {
  assert.equal(clicksFor(link, { dedupe: "unique", audience: "human" }), 100)
  assert.equal(clicksFor(link, { dedupe: "unique", audience: "all" }), 120)
  assert.equal(clicksFor(link, { dedupe: "raw", audience: "human" }), 140)
  assert.equal(clicksFor(link, { dedupe: "raw", audience: "all" }), 180)
})

// =============================================================================
// The ramp
// =============================================================================

test("intensity is monotonic — more clicks never yields a lower share", () => {
  const shares = [0.1, 0.25, 0.5, 0.75, 1].map((f) => heatStyle(f * 500, 500, "hot").share)
  for (let i = 1; i < shares.length; i++) assert.ok(shares[i] >= shares[i - 1])
})

test("a clicked link is never rendered as invisible", () => {
  // The whole point of the step-150 floor: 1 click out of 10,000 still has to
  // read as "somebody clicked this", not as "nobody did".
  const faint = heatStyle(1, 10000, "hot")
  assert.equal(faint.state, "hot")
  assert.notEqual(faint.fill, "transparent")
})

test("zero clicks is visually distinct from a faint click", () => {
  const zero = heatStyle(0, 10000, "hot")
  const one = heatStyle(1, 10000, "hot")
  assert.equal(zero.state, "cold")
  assert.equal(zero.fill, "transparent")
  assert.notEqual(one.fill, zero.fill)
})

test("the ramp flips on dark ground, so the hottest link stays visible", () => {
  const onLight = heatStyle(500, 500, "hot")
  const onDark = heatStyle(500, 500, "hot", true)
  // Same magnitude, opposite ends of the ramp.
  assert.notEqual(onLight.stroke, onDark.stroke)
  // On light ground a max-intensity link is dark; on dark ground it's light.
  assert.ok((luminanceOf(toRgb(onLight.stroke)) ?? 1) < 0.3)
  assert.ok((luminanceOf(toRgb(onDark.stroke)) ?? 0) > 0.3)
})

test("unattributable states never borrow the click ramp", () => {
  for (const state of ["templated", "unattributed"] as const) {
    const style = heatStyle(999, 999, state)
    assert.equal(style.share, 0)
    assert.ok(style.stroke.startsWith("#fab219") || style.stroke === "#fab219")
  }
})

test("untrackable links get the quietest treatment and no warning hue", () => {
  const style = heatStyle(0, 100, "untrackable")
  assert.equal(style.fill, "transparent")
  assert.notEqual(style.stroke, "#fab219")
})

// =============================================================================
// Ground detection
// =============================================================================

test("luminanceOf separates light from dark grounds", () => {
  assert.ok((luminanceOf("rgb(255, 255, 255)") ?? 0) > DARK_GROUND_THRESHOLD)
  assert.ok((luminanceOf("rgb(17, 17, 17)") ?? 1) < DARK_GROUND_THRESHOLD)
})

test("a fully transparent ground is undecidable, not dark", () => {
  // Returning 0 here would make every default-background link flip its ramp.
  assert.equal(luminanceOf("rgba(0, 0, 0, 0)"), null)
})

test("luminanceOf rejects unparseable colors", () => {
  assert.equal(luminanceOf("transparent"), null)
  assert.equal(luminanceOf(""), null)
})

/** Hex → rgb() so luminanceOf can read a ramp stroke. */
function toRgb(hex: string): string {
  const c = hex.replace("#", "")
  return `rgb(${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)})`
}
