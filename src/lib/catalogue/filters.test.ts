import { test } from "node:test"
import assert from "node:assert/strict"

/**
 * Mirrors the TEST_NAME pattern in scripts/ingest.ts.
 *
 * Duplicated deliberately: the ingest script isn't importable as a module (it
 * reads argv at load), and this pattern is the one place a mistake silently
 * deletes real emails from the archive, so it gets its own guard.
 */
const TEST_NAME = /(?<![a-z])test(?:s|ing)?(?![a-z])/i

test("matches names that really are internal tests", () => {
  for (const name of [
    "Test ZC",
    "EW Test Campaign",
    "Clearbit Risk API Test",
    "test",
    "TEST",
    "smoke-test",
    "test2",
    "load tests",
    "testing welcome flow",
    "QA_test_email",
  ]) {
    assert.ok(TEST_NAME.test(name), `should match: ${name}`)
  }
})

test("does not match ordinary marketing copy containing the letters 'test'", () => {
  // "Make the safe path the fastest path" is a real send in this workspace; a
  // substring filter would have hidden it.
  for (const name of [
    "Make the safe path the fastest path",
    "fastest",
    "Our latest features",
    "latest",
    "greatest hits",
    "Enter the contest",
    "protest",
    "A customer testimonial",
    "testimonials",
    "attestation",
  ]) {
    assert.ok(!TEST_NAME.test(name), `should NOT match: ${name}`)
  }
})

test("real campaign names from the workspace are unaffected", () => {
  for (const name of [
    "global_em_vercel_ship-london-FUP_Registered_20260622_4529",
    "NAMER_em_Vercel_Email-invite-2---EAA_20260813_MOPS-4813",
    "apac_em_vercel_ship-syd-promo-1_20260701",
    "global_nur_vercel_function-timeout-rescue_20260731_4649",
  ]) {
    assert.ok(!TEST_NAME.test(name), `should NOT match: ${name}`)
  }
})

/**
 * Mirrors the A/B container filter in emailActions().
 *
 * Customer.io returns a parent action alongside its variants; the parent has no
 * body and metrics equal to the SUM of its children, so ingesting it both
 * invents a bodiless email and double-counts every send.
 */
function dropAbContainers<T extends { id: number; parent_action_id?: number }>(actions: T[]): T[] {
  const parentIds = new Set(
    actions.map((a) => a.parent_action_id).filter((id): id is number => typeof id === "number"),
  )
  return actions.filter((a) => !parentIds.has(a.id))
}

test("drops the A/B parent and keeps its variants", () => {
  // Campaign 43 as the API actually returns it.
  const kept = dropAbContainers([
    { id: 729 },
    { id: 731 },
    { id: 732, parent_action_id: 729 },
    { id: 733, parent_action_id: 729 },
  ])
  assert.deepEqual(kept.map((a) => a.id), [731, 732, 733])
})

test("a campaign with no variants is left alone", () => {
  const kept = dropAbContainers([{ id: 1 }, { id: 2 }, { id: 3 }])
  assert.deepEqual(kept.map((a) => a.id), [1, 2, 3])
})

test("standalone actions are never mistaken for containers", () => {
  // 731 has no parent and no children — a normal single email.
  const kept = dropAbContainers([{ id: 731 }, { id: 732, parent_action_id: 729 }])
  assert.ok(kept.some((a) => a.id === 731))
})
