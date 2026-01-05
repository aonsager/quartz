import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { defaultProcessedContent } from "../vfile"
import { FullPageLayout } from "../../cfg"
import { FullSlug, pathToRoot } from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { write } from "./helpers"
import { visit } from "unist-util-visit"
import isAbsoluteUrl from "is-absolute-url"
import { getDate } from "../../components/Date"
import ExternalLinksContent from "../../components/pages/ExternalLinksContent"
import { toString } from "hast-util-to-string"
import { toHtml } from "hast-util-to-html"

// Blacklist of domains to ignore when collecting external links
const DOMAIN_BLACKLIST = [
  "invisibleparade.com",
  "amazon.", // Matches amazon.com, amazon.co.uk, etc.
]

// Helper function to check if a URL should be blacklisted
function isBlacklisted(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    return DOMAIN_BLACKLIST.some(domain => {
      const lowerDomain = domain.toLowerCase()
      // If domain ends with '.', treat it as a prefix match
      if (lowerDomain.endsWith('.')) {
        return hostname.startsWith(lowerDomain) || hostname.includes('.' + lowerDomain.slice(0, -1))
      }
      // Otherwise, exact match or subdomain match
      return hostname === lowerDomain || hostname.endsWith('.' + lowerDomain)
    })
  } catch (e) {
    // If URL parsing fails, don't blacklist it
    return false
  }
}

// Helper function to extract the sentence containing the link
function extractSentenceContext(parentText: string, linkText: string): string {
  if (!parentText || !linkText) return ""

  // Find the position of the link text in the parent
  const linkIndex = parentText.indexOf(linkText)
  if (linkIndex === -1) return parentText.trim()

  // Find sentence boundaries (., ?, !)
  // Look backwards from link to find sentence start
  let sentenceStart = 0
  for (let i = linkIndex - 1; i >= 0; i--) {
    if ([".", "?", "!"].includes(parentText[i])) {
      // Check if followed by space or closing punctuation then space (or end of text)
      let nextPos = i + 1
      while (
        nextPos < parentText.length &&
        [")", "]", "}", '"', "'"].includes(parentText[nextPos])
      ) {
        nextPos++
      }
      if (
        nextPos >= parentText.length ||
        parentText[nextPos] === " " ||
        parentText[nextPos] === "\n"
      ) {
        sentenceStart = i + 1
        break
      }
    }
  }

  // Look forwards from link to find sentence end
  let sentenceEnd = parentText.length
  for (let i = linkIndex + linkText.length; i < parentText.length; i++) {
    if ([".", "?", "!"].includes(parentText[i])) {
      // Check if followed by space or closing punctuation then space (or end of text)
      let nextPos = i + 1
      while (
        nextPos < parentText.length &&
        [")", "]", "}", '"', "'"].includes(parentText[nextPos])
      ) {
        nextPos++
      }
      if (
        nextPos >= parentText.length ||
        parentText[nextPos] === " " ||
        parentText[nextPos] === "\n"
      ) {
        sentenceEnd = nextPos
        break
      }
    }
  }

  return parentText.slice(sentenceStart, sentenceEnd).trim()
}

interface ExternalLinkData {
  url: string
  linkText: string
  context: string
  publishedDate: Date | undefined
  sourcePage: {
    slug: FullSlug
    title: string
  }
}

interface DeduplicatedLink {
  url: string
  earliestDate: Date | undefined
  occurrences: Array<{
    linkText: string
    context: string
    sourcePage: {
      slug: FullSlug
      title: string
    }
    publishedDate: Date | undefined
  }>
}

export const ExternalLinksPage: QuartzEmitterPlugin = () => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: ExternalLinksContent(),
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "ExternalLinksPage",
    getQuartzComponents() {
      return [
        Head,
        Header,
        Body,
        ...header,
        ...beforeBody,
        pageBody,
        ...afterBody,
        ...left,
        ...right,
        Footer,
      ]
    },
    async *emit(ctx, content, resources) {
      const cfg = ctx.cfg.configuration
      const slug = "external-links" as FullSlug

      // Extract all external links from all content
      const externalLinks: ExternalLinkData[] = []

      for (const [tree, file] of content) {
        const publishedDate = getDate(cfg, file.data)

        try {
          visit(tree, "element", (node: any, _index: any, parent: any) => {
            try {
              if (
                node.tagName === "a" &&
                node.properties &&
                typeof node.properties.href === "string"
              ) {
                // Check if this is an external URL
                if (!isAbsoluteUrl(node.properties.href, { httpOnly: false })) {
                  return // Skip internal links
                }

                // Skip blacklisted domains
                if (isBlacklisted(node.properties.href)) {
                  return
                }

                // Extract link text
                let linkText = ""
                try {
                  linkText = node.children
                    .filter((child: any) => child.type === "text")
                    .map((child: any) => child.value)
                    .join(" ")
                    .trim()
                } catch (e) {
                  console.warn(`Could not extract link text for ${node.properties.href}`)
                }

                // Use URL as fallback if no text
                if (!linkText) {
                  linkText = node.properties.href
                }

                // Extract sentence context from parent element
                let context = ""
                try {
                  if (parent) {
                    const parentText = toString(parent)
                    const sentenceBounds = extractSentenceContext(parentText, linkText)
                    // Convert parent to HTML to preserve link structure
                    if (sentenceBounds) {
                      context = toHtml(parent)
                    }
                  }
                } catch (e) {
                  console.warn(`Could not extract context for ${node.properties.href}`)
                }

                externalLinks.push({
                  url: node.properties.href,
                  linkText,
                  context,
                  publishedDate,
                  sourcePage: {
                    slug: file.data.slug!,
                    title: file.data.frontmatter?.title ?? "Untitled",
                  },
                })
              }
            } catch (e) {
              console.error(`Error processing link node in ${file.data.slug}:`, e)
            }
          })
        } catch (e) {
          console.error(`Error traversing tree for ${file.data.slug}:`, e)
        }
      }

      // Deduplicate by URL, keeping earliest date and tracking all occurrences
      const linkMap = new Map<string, DeduplicatedLink>()

      for (const link of externalLinks) {
        if (!linkMap.has(link.url)) {
          linkMap.set(link.url, {
            url: link.url,
            earliestDate: link.publishedDate,
            occurrences: [],
          })
        }

        const existing = linkMap.get(link.url)!

        // Update to earliest published date
        if (
          link.publishedDate &&
          (!existing.earliestDate || link.publishedDate < existing.earliestDate)
        ) {
          existing.earliestDate = link.publishedDate
        }

        existing.occurrences.push({
          linkText: link.linkText,
          context: link.context,
          sourcePage: link.sourcePage,
          publishedDate: link.publishedDate,
        })
      }

      // Sort by date (descending - newest first)
      const sortedLinks = Array.from(linkMap.values()).sort((a, b) => {
        if (a.earliestDate && b.earliestDate) {
          return b.earliestDate.getTime() - a.earliestDate.getTime()
        } else if (a.earliestDate && !b.earliestDate) {
          return -1 // Links with dates come first
        } else if (!a.earliestDate && b.earliestDate) {
          return 1
        }
        return a.url.localeCompare(b.url)
      })

      // Create synthetic page
      const [tree, vfile] = defaultProcessedContent({
        slug,
        text: "External Links",
        description: "A chronological list of all external links from this site",
        frontmatter: { title: "External Links", tags: [] },
      })

      const externalResources = pageResources(pathToRoot(slug), resources)
      const componentData: QuartzComponentProps = {
        ctx,
        fileData: vfile.data,
        externalResources,
        cfg,
        children: [],
        tree,
        allFiles: content.map((c) => c[1].data),
        externalLinks: sortedLinks,
      } as any

      yield write({
        ctx,
        content: renderPage(cfg, slug, componentData, opts, externalResources),
        slug,
        ext: ".html",
      })
    },
    async *partialEmit() {
      // Skip partial rebuild for now - could optimize later
    },
  }
}
