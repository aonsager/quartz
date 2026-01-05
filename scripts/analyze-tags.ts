#!/usr/bin/env npx tsx

import fs from "fs"
import path from "path"
import matter from "gray-matter"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { globby } from "globby"

// ============================================================================
// Types
// ============================================================================

interface FileTagData {
  filePath: string
  relativePath: string
  title: string
  tags: string[]
  rawTags: string[] // before normalization
}

interface DuplicateGroup {
  tags: string[]
  type: "case" | "levenshtein" | "plural"
  suggestion: string
}

interface TagUsage {
  tag: string
  count: number
  files: string[]
}

interface IsolatedPage {
  file: string
  tags: string[]
  maxSimilarity: number
  mostSimilarTo: string
}

interface TagSuggestion {
  file: string
  currentTags: string[]
  suggestedTag: string
  reason: string
}

interface TagAnalysis {
  totalFiles: number
  filesWithTags: number
  uniqueTags: number
  frequency: Map<string, Set<string>>
  duplicates: DuplicateGroup[]
  underused: TagUsage[]
  isolated: IsolatedPage[]
  suggestions: TagSuggestion[]
}

// ============================================================================
// Tag Normalization (replicates Quartz's slugTag logic)
// ============================================================================

export function sluggify(s: string): string {
  return s
    .split("/")
    .map((segment) =>
      segment
        .replace(/\s/g, "-")
        .replace(/&/g, "-and-")
        .replace(/%/g, "-percent")
        .replace(/\?/g, "")
        .replace(/#/g, "")
        .toLowerCase(),
    )
    .join("/")
    .replace(/\/$/, "")
}

export function slugTag(tag: string): string {
  return tag
    .split("/")
    .map((tagSegment) => sluggify(tagSegment))
    .join("/")
}

// ============================================================================
// Levenshtein Distance
// ============================================================================

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// ============================================================================
// Jaccard Similarity
// ============================================================================

export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0

  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])

  return intersection.size / union.size
}

// ============================================================================
// File Scanning
// ============================================================================

async function scanContentFiles(
  contentDir: string,
  excludeMicro: boolean,
): Promise<FileTagData[]> {
  const files: FileTagData[] = []

  const pattern = path.join(contentDir, "**/*.md")
  const matchedFiles = await globby(pattern)

  for (const filePath of matchedFiles) {
    const relativePath = path.relative(contentDir, filePath)

    // Skip micro posts if requested
    if (excludeMicro && relativePath.startsWith("micro/")) {
      continue
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const parsed = matter(content)

      const rawTags: string[] = parsed.data.tags || parsed.data.tag || []
      const tagsArray = Array.isArray(rawTags) ? rawTags : [rawTags]
      const normalizedTags = tagsArray
        .filter((t) => typeof t === "string" && t.length > 0)
        .map((t) => slugTag(t))

      files.push({
        filePath,
        relativePath,
        title: parsed.data.title || path.basename(filePath, ".md"),
        tags: normalizedTags,
        rawTags: tagsArray.filter((t) => typeof t === "string"),
      })
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error)
    }
  }

  return files
}

// ============================================================================
// Analysis Functions
// ============================================================================

function buildFrequencyMap(files: FileTagData[]): Map<string, Set<string>> {
  const frequency = new Map<string, Set<string>>()

  for (const file of files) {
    for (const tag of file.tags) {
      if (!frequency.has(tag)) {
        frequency.set(tag, new Set())
      }
      frequency.get(tag)!.add(file.relativePath)
    }
  }

  return frequency
}

function findDuplicates(files: FileTagData[]): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = []
  const seen = new Set<string>()

  // Collect all raw tags and their normalized forms
  const tagMap = new Map<string, Set<string>>() // normalized -> raw variants

  for (const file of files) {
    for (let i = 0; i < file.rawTags.length; i++) {
      const raw = file.rawTags[i]
      const normalized = file.tags[i]
      if (!normalized) continue

      if (!tagMap.has(normalized)) {
        tagMap.set(normalized, new Set())
      }
      tagMap.get(normalized)!.add(raw)
    }
  }

  // Check for case variants (same normalized, different raw)
  for (const [normalized, variants] of tagMap) {
    if (variants.size > 1) {
      const key = [...variants].sort().join("|")
      if (!seen.has(key)) {
        seen.add(key)
        duplicates.push({
          tags: [...variants],
          type: "case",
          suggestion: `Normalize to "${normalized}"`,
        })
      }
    }
  }

  // Check for Levenshtein distance between normalized tags
  // Only for longer tags (5+ chars) to avoid false positives on short tags
  const allNormalizedTags = [...tagMap.keys()]
  for (let i = 0; i < allNormalizedTags.length; i++) {
    for (let j = i + 1; j < allNormalizedTags.length; j++) {
      const a = allNormalizedTags[i]
      const b = allNormalizedTags[j]

      // Skip short tags - too many false positives
      if (a.length < 5 || b.length < 5) continue

      // Skip if one is a prefix of another (hierarchical tags)
      if (a.startsWith(b + "/") || b.startsWith(a + "/")) continue

      // Only check distance 1 for typos, skip distance 2 (too many false positives)
      const distance = levenshteinDistance(a, b)
      if (distance === 1) {
        const key = [a, b].sort().join("|")
        if (!seen.has(key)) {
          seen.add(key)
          duplicates.push({
            tags: [a, b],
            type: "levenshtein",
            suggestion: `Possible typo (edit distance: ${distance})`,
          })
        }
      }
    }
  }

  // Check for plural forms
  for (let i = 0; i < allNormalizedTags.length; i++) {
    for (let j = i + 1; j < allNormalizedTags.length; j++) {
      const a = allNormalizedTags[i]
      const b = allNormalizedTags[j]

      const key = [a, b].sort().join("|")
      if (seen.has(key)) continue

      // Check simple plural (s suffix)
      if (a + "s" === b || b + "s" === a) {
        seen.add(key)
        const singular = a.length < b.length ? a : b
        duplicates.push({
          tags: [a, b],
          type: "plural",
          suggestion: `Use singular "${singular}"`,
        })
      }
      // Check -es plural
      else if (a + "es" === b || b + "es" === a) {
        seen.add(key)
        const singular = a.length < b.length ? a : b
        duplicates.push({
          tags: [a, b],
          type: "plural",
          suggestion: `Use singular "${singular}"`,
        })
      }
    }
  }

  return duplicates
}

function findUnderused(
  frequency: Map<string, Set<string>>,
  threshold: number,
): TagUsage[] {
  const underused: TagUsage[] = []

  for (const [tag, files] of frequency) {
    if (files.size <= threshold) {
      underused.push({
        tag,
        count: files.size,
        files: [...files],
      })
    }
  }

  return underused.sort((a, b) => a.count - b.count)
}

function findIsolated(
  files: FileTagData[],
  threshold: number,
): IsolatedPage[] {
  const isolated: IsolatedPage[] = []

  // Only consider files with tags
  const filesWithTags = files.filter((f) => f.tags.length > 0)

  for (const file of filesWithTags) {
    const fileTags = new Set(file.tags)
    let maxSimilarity = 0
    let mostSimilarFile = ""

    for (const other of filesWithTags) {
      if (other.relativePath === file.relativePath) continue

      const otherTags = new Set(other.tags)
      const similarity = jaccardSimilarity(fileTags, otherTags)

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity
        mostSimilarFile = other.relativePath
      }
    }

    if (maxSimilarity < threshold) {
      isolated.push({
        file: file.relativePath,
        tags: file.tags,
        maxSimilarity,
        mostSimilarTo: mostSimilarFile,
      })
    }
  }

  return isolated.sort((a, b) => a.maxSimilarity - b.maxSimilarity)
}

function generateSuggestions(
  files: FileTagData[],
  frequency: Map<string, Set<string>>,
): TagSuggestion[] {
  const suggestions: TagSuggestion[] = []

  // Build co-occurrence matrix
  const cooccurrence = new Map<string, Map<string, number>>()

  for (const file of files) {
    for (const tag1 of file.tags) {
      if (!cooccurrence.has(tag1)) {
        cooccurrence.set(tag1, new Map())
      }
      for (const tag2 of file.tags) {
        if (tag1 !== tag2) {
          const current = cooccurrence.get(tag1)!.get(tag2) || 0
          cooccurrence.get(tag1)!.set(tag2, current + 1)
        }
      }
    }
  }

  // For each file, suggest tags that frequently co-occur with existing tags
  for (const file of files) {
    if (file.tags.length === 0) continue

    const fileTags = new Set(file.tags)
    const tagScores = new Map<string, number>()

    for (const existingTag of file.tags) {
      const cooccurringTags = cooccurrence.get(existingTag)
      if (!cooccurringTags) continue

      for (const [otherTag, count] of cooccurringTags) {
        if (!fileTags.has(otherTag)) {
          const current = tagScores.get(otherTag) || 0
          tagScores.set(otherTag, current + count)
        }
      }
    }

    // Find tags with high co-occurrence score
    const sortedTags = [...tagScores.entries()].sort((a, b) => b[1] - a[1])

    for (const [suggestedTag, score] of sortedTags.slice(0, 2)) {
      // Suggest if tag co-occurs with at least 2 of the file's tags
      // and appears in at least 3 files total
      const tagFreq = frequency.get(suggestedTag)?.size || 0
      if (score >= 2 && tagFreq >= 3) {
        suggestions.push({
          file: file.relativePath,
          currentTags: file.tags,
          suggestedTag,
          reason: `Co-occurs with ${score} of your tags (appears in ${tagFreq} files)`,
        })
      }
    }
  }

  return suggestions
}

// ============================================================================
// Report Generation
// ============================================================================

function generateMarkdownReport(analysis: TagAnalysis): string {
  const lines: string[] = []

  lines.push("# Tag Analysis Report")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")

  // Summary
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Total files analyzed: ${analysis.totalFiles}`)
  lines.push(`- Files with tags: ${analysis.filesWithTags}`)
  lines.push(`- Unique tags: ${analysis.uniqueTags}`)
  lines.push(`- Files without tags: ${analysis.totalFiles - analysis.filesWithTags}`)
  lines.push("")

  // Tag Frequency
  lines.push("## Tag Frequency (ranked)")
  lines.push("")
  lines.push("| Rank | Tag | Count |")
  lines.push("|------|-----|-------|")

  const sortedFrequency = [...analysis.frequency.entries()].sort(
    (a, b) => b[1].size - a[1].size,
  )

  let rank = 1
  for (const [tag, files] of sortedFrequency) {
    lines.push(`| ${rank} | ${tag} | ${files.size} |`)
    rank++
  }
  lines.push("")

  // Potential Duplicates
  if (analysis.duplicates.length > 0) {
    lines.push("## Potential Duplicates/Synonyms")
    lines.push("")
    lines.push("| Tags | Type | Suggestion |")
    lines.push("|------|------|------------|")

    for (const dup of analysis.duplicates) {
      const tagsStr = dup.tags.map((t) => `\`${t}\``).join(", ")
      lines.push(`| ${tagsStr} | ${dup.type} | ${dup.suggestion} |`)
    }
    lines.push("")
  } else {
    lines.push("## Potential Duplicates/Synonyms")
    lines.push("")
    lines.push("No potential duplicates found.")
    lines.push("")
  }

  // Underused Tags
  if (analysis.underused.length > 0) {
    lines.push("## Underused Tags")
    lines.push("")
    lines.push("| Tag | Count | Files |")
    lines.push("|-----|-------|-------|")

    for (const tag of analysis.underused) {
      const filesStr = tag.files.map((f) => `\`${f}\``).join(", ")
      lines.push(`| ${tag.tag} | ${tag.count} | ${filesStr} |`)
    }
    lines.push("")
  } else {
    lines.push("## Underused Tags")
    lines.push("")
    lines.push("No underused tags found.")
    lines.push("")
  }

  // Isolated Pages
  if (analysis.isolated.length > 0) {
    lines.push("## Isolated Pages (low tag connectivity)")
    lines.push("")
    lines.push("| File | Tags | Max Similarity | Most Similar To |")
    lines.push("|------|------|----------------|-----------------|")

    for (const page of analysis.isolated) {
      const tagsStr = page.tags.map((t) => `\`${t}\``).join(", ")
      const similarity = (page.maxSimilarity * 100).toFixed(0) + "%"
      lines.push(`| ${page.file} | ${tagsStr} | ${similarity} | ${page.mostSimilarTo} |`)
    }
    lines.push("")
  } else {
    lines.push("## Isolated Pages")
    lines.push("")
    lines.push("No isolated pages found (all pages have sufficient tag connectivity).")
    lines.push("")
  }

  // Suggested Tag Additions
  if (analysis.suggestions.length > 0) {
    lines.push("## Suggested Tag Additions")
    lines.push("")
    lines.push("| File | Current Tags | Suggested | Reason |")
    lines.push("|------|--------------|-----------|--------|")

    for (const suggestion of analysis.suggestions) {
      const currentStr = suggestion.currentTags.map((t) => `\`${t}\``).join(", ")
      lines.push(
        `| ${suggestion.file} | ${currentStr} | \`${suggestion.suggestedTag}\` | ${suggestion.reason} |`,
      )
    }
    lines.push("")
  } else {
    lines.push("## Suggested Tag Additions")
    lines.push("")
    lines.push("No tag suggestions at this time.")
    lines.push("")
  }

  return lines.join("\n")
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("analyze-tags")
    .usage("$0 [options]")
    .option("directory", {
      alias: "d",
      type: "string",
      default: "content",
      description: "Content directory to analyze",
    })
    .option("output", {
      alias: "o",
      type: "string",
      default: "tmp/tag-report.md",
      description: "Output file path",
    })
    .option("include-micro", {
      type: "boolean",
      default: false,
      description: "Include /micro/ posts (excluded by default)",
    })
    .option("min-usage", {
      type: "number",
      default: 2,
      description: "Threshold for underused tags",
    })
    .option("isolation-threshold", {
      type: "number",
      default: 0.2,
      description: "Jaccard similarity threshold for isolation detection",
    })
    .help()
    .parse()

  const contentDir = path.resolve(argv.directory)
  const outputPath = path.resolve(argv.output)
  const excludeMicro = !argv["include-micro"]

  console.log(`Scanning ${contentDir}...`)
  if (excludeMicro) {
    console.log("  (excluding /micro/ posts)")
  }

  const files = await scanContentFiles(contentDir, excludeMicro)
  console.log(`Found ${files.length} files`)

  const filesWithTags = files.filter((f) => f.tags.length > 0)
  console.log(`  ${filesWithTags.length} files have tags`)

  console.log("Building frequency map...")
  const frequency = buildFrequencyMap(files)
  console.log(`  ${frequency.size} unique tags`)

  console.log("Finding potential duplicates...")
  const duplicates = findDuplicates(files)
  console.log(`  ${duplicates.length} potential duplicate groups`)

  console.log("Finding underused tags...")
  const underused = findUnderused(frequency, argv["min-usage"])
  console.log(`  ${underused.length} underused tags`)

  console.log("Finding isolated pages...")
  const isolated = findIsolated(files, argv["isolation-threshold"])
  console.log(`  ${isolated.length} isolated pages`)

  console.log("Generating tag suggestions...")
  const suggestions = generateSuggestions(files, frequency)
  console.log(`  ${suggestions.length} suggestions`)

  const analysis: TagAnalysis = {
    totalFiles: files.length,
    filesWithTags: filesWithTags.length,
    uniqueTags: frequency.size,
    frequency,
    duplicates,
    underused,
    isolated,
    suggestions,
  }

  console.log("\nGenerating report...")
  const report = generateMarkdownReport(analysis)

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, report)
  console.log(`Report written to ${outputPath}`)
}

// Only run main when this is the entry point (not when imported for testing)
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  main().catch((error) => {
    console.error("Error:", error)
    process.exit(1)
  })
}
