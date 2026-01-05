import test, { describe } from "node:test"
import assert from "node:assert"
import { sluggify, slugTag, levenshteinDistance, jaccardSimilarity } from "./analyze-tags"

describe("sluggify", () => {
  test("lowercases strings", () => {
    assert.strictEqual(sluggify("HELLO"), "hello")
  })

  test("replaces spaces with hyphens", () => {
    assert.strictEqual(sluggify("hello world"), "hello-world")
  })

  test("replaces ampersand with -and-", () => {
    assert.strictEqual(sluggify("arts & crafts"), "arts--and--crafts")
  })

  test("replaces percent with -percent", () => {
    assert.strictEqual(sluggify("100% complete"), "100-percent-complete")
  })

  test("removes question marks", () => {
    assert.strictEqual(sluggify("what is this?"), "what-is-this")
  })

  test("removes hash symbols", () => {
    assert.strictEqual(sluggify("tag#1"), "tag1")
  })

  test("handles paths with slashes", () => {
    assert.strictEqual(sluggify("parent/child"), "parent/child")
  })

  test("removes trailing slash", () => {
    assert.strictEqual(sluggify("path/"), "path")
  })
})

describe("slugTag", () => {
  test("normalizes simple tags", () => {
    assert.strictEqual(slugTag("AI"), "ai")
  })

  test("normalizes tags with spaces", () => {
    assert.strictEqual(slugTag("Machine Learning"), "machine-learning")
  })

  test("handles hierarchical tags", () => {
    assert.strictEqual(slugTag("Parent/Child"), "parent/child")
  })

  test("normalizes each segment of hierarchical tags", () => {
    assert.strictEqual(slugTag("Tech Topics/AI Stuff"), "tech-topics/ai-stuff")
  })
})

describe("levenshteinDistance", () => {
  test("returns 0 for identical strings", () => {
    assert.strictEqual(levenshteinDistance("hello", "hello"), 0)
  })

  test("returns string length for empty string comparison", () => {
    assert.strictEqual(levenshteinDistance("hello", ""), 5)
    assert.strictEqual(levenshteinDistance("", "hello"), 5)
  })

  test("returns 0 for two empty strings", () => {
    assert.strictEqual(levenshteinDistance("", ""), 0)
  })

  test("calculates single character difference", () => {
    assert.strictEqual(levenshteinDistance("cat", "bat"), 1)
  })

  test("calculates insertion distance", () => {
    assert.strictEqual(levenshteinDistance("cat", "cats"), 1)
  })

  test("calculates deletion distance", () => {
    assert.strictEqual(levenshteinDistance("cats", "cat"), 1)
  })

  test("calculates multiple operations", () => {
    assert.strictEqual(levenshteinDistance("kitten", "sitting"), 3)
  })

  test("detects plural forms", () => {
    assert.strictEqual(levenshteinDistance("game", "games"), 1)
    assert.strictEqual(levenshteinDistance("photo", "photos"), 1)
  })

  test("detects similar tags", () => {
    assert.strictEqual(levenshteinDistance("color", "colors"), 1)
    assert.strictEqual(levenshteinDistance("review", "reviews"), 1)
  })
})

describe("jaccardSimilarity", () => {
  test("returns 1 for identical sets", () => {
    const set = new Set(["a", "b", "c"])
    assert.strictEqual(jaccardSimilarity(set, set), 1)
  })

  test("returns 1 for two empty sets", () => {
    assert.strictEqual(jaccardSimilarity(new Set(), new Set()), 1)
  })

  test("returns 0 when one set is empty", () => {
    const set = new Set(["a", "b"])
    assert.strictEqual(jaccardSimilarity(set, new Set()), 0)
    assert.strictEqual(jaccardSimilarity(new Set(), set), 0)
  })

  test("returns 0 for completely disjoint sets", () => {
    const setA = new Set(["a", "b"])
    const setB = new Set(["c", "d"])
    assert.strictEqual(jaccardSimilarity(setA, setB), 0)
  })

  test("calculates correct similarity for overlapping sets", () => {
    const setA = new Set(["a", "b", "c"])
    const setB = new Set(["b", "c", "d"])
    // intersection: {b, c} = 2, union: {a, b, c, d} = 4
    assert.strictEqual(jaccardSimilarity(setA, setB), 0.5)
  })

  test("calculates correct similarity when one set is subset", () => {
    const setA = new Set(["a", "b"])
    const setB = new Set(["a", "b", "c", "d"])
    // intersection: {a, b} = 2, union: {a, b, c, d} = 4
    assert.strictEqual(jaccardSimilarity(setA, setB), 0.5)
  })

  test("handles single element sets", () => {
    const setA = new Set(["a"])
    const setB = new Set(["a"])
    assert.strictEqual(jaccardSimilarity(setA, setB), 1)
  })

  test("is symmetric", () => {
    const setA = new Set(["a", "b", "c"])
    const setB = new Set(["c", "d", "e"])
    assert.strictEqual(
      jaccardSimilarity(setA, setB),
      jaccardSimilarity(setB, setA),
    )
  })
})
