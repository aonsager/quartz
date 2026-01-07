import { Root } from "hast"
import { GlobalConfiguration } from "../../cfg"
import { getDate } from "../../components/Date"
import { escapeHTML } from "../../util/escape"
import { FilePath, FullSlug, SimpleSlug, joinSegments, simplifySlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { toHtml } from "hast-util-to-html"
import { write } from "./helpers"

interface ContentDetails {
  slug: FullSlug
  filePath: FilePath
  title: string
  tags: string[]
  content: string
  richContent?: string
  date?: Date
  description?: string
  link?: string
}

interface Options {
  feedLimit?: number
  authorName: string
  feedSubtitle?: string
}

const defaultOptions: Options = {
  feedLimit: 20,
  authorName: "Alex Onsager",
  feedSubtitle: "My personal webpage and blog.",
}

// Helper to remove <svg> tags and their contents
function stripSvg(html: string): string {
  return html.replace(/<svg[\s\S]*?<\/svg>/gi, "")
}

function generateAtomFeed(
  cfg: GlobalConfiguration,
  entries: ContentDetails[],
  feedSlug: string,
  opts: Options,
): string {
  const base = cfg.baseUrl ?? ""
  const feedUrl = `https://${joinSegments(base, feedSlug)}.xml`
  const siteUrl = `https://${base}/`

  const createEntry = (content: ContentDetails): string => {
    const slug = simplifySlug(content.slug)
    const fullUrl = `https://${joinSegments(base, encodeURI(slug))}`
    const dateStr = content.date?.toISOString() ?? new Date().toISOString()

    // Build category elements for tags
    const categories = content.tags
      .map((tag) => `<category term="${escapeHTML(tag)}" />`)
      .join("")

    return `<entry>
    <title type="html">${escapeHTML(content.title)}</title>
    <link href="${fullUrl}" rel="alternate" type="text/html" title="${escapeHTML(content.title)}" />
    <published>${dateStr}</published>
    <updated>${dateStr}</updated>
    <id>${fullUrl}</id>
    <content type="html" xml:base="${fullUrl}"><![CDATA[${content.richContent ?? content.description ?? ""}]]></content>
    ${categories}
    <summary type="html"><![CDATA[${content.description ?? content.content}]]></summary>
  </entry>`
  }

  // Sort by date descending
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.date && b.date) {
      return b.date.getTime() - a.date.getTime()
    } else if (a.date && !b.date) {
      return -1
    } else if (!a.date && b.date) {
      return 1
    }
    return a.title.localeCompare(b.title)
  })

  const limitedEntries = sortedEntries.slice(0, opts.feedLimit ?? sortedEntries.length)
  const items = limitedEntries.map((entry) => createEntry(entry)).join("")

  // Get the most recent update date from entries, or use current date
  const lastUpdated =
    sortedEntries.length > 0 && sortedEntries[0].date
      ? sortedEntries[0].date.toISOString()
      : new Date().toISOString()

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <generator uri="https://quartz.jzhao.xyz/" version="4">Quartz</generator>
  <link href="${feedUrl}" rel="self" type="application/atom+xml" />
  <link href="${siteUrl}" rel="alternate" type="text/html" />
  <updated>${lastUpdated}</updated>
  <id>${feedUrl}</id>
  <title type="html">${escapeHTML(cfg.pageTitle)}</title>
  <subtitle>${escapeHTML(opts.feedSubtitle ?? "")}</subtitle>
  <author>
    <name>${escapeHTML(opts.authorName)}</name>
  </author>
  ${items}
</feed>`
}

export const AtomFeeds: QuartzEmitterPlugin<Partial<Options>> = (opts) => {
  const options = { ...defaultOptions, ...opts }

  return {
    name: "AtomFeeds",
    async *emit(ctx, content) {
      const cfg = ctx.cfg.configuration

      // Collect entries for each feed type
      const metaRSSEntries: ContentDetails[] = []
      const linkEntries: ContentDetails[] = []

      for (const [tree, file] of content) {
        const slug = file.data.slug!
        const frontmatter = file.data.frontmatter
        const date = getDate(ctx.cfg.configuration, file.data) ?? undefined

        // Skip if no content
        if (!file.data.text || file.data.text === "") {
          continue
        }

        const richContent = stripSvg(toHtml(tree as Root, { allowDangerousHtml: true }))

        const contentDetails: ContentDetails = {
          slug,
          filePath: file.data.relativePath!,
          title: frontmatter?.title ?? "",
          tags: frontmatter?.tags ?? [],
          content: file.data.text ?? "",
          richContent,
          date,
          description: file.data.description ?? "",
          link: frontmatter?.link as string | undefined,
        }

        // Check for metaRSS (must be explicitly true)
        if (frontmatter?.metaRSS === true) {
          metaRSSEntries.push(contentDetails)
        }

        // Check for link (must have a value)
        if (frontmatter?.link) {
          linkEntries.push(contentDetails)
        }
      }

      // Create union for all.xml (deduplicate by slug)
      const allEntriesMap = new Map<FullSlug, ContentDetails>()
      for (const entry of metaRSSEntries) {
        allEntriesMap.set(entry.slug, entry)
      }
      for (const entry of linkEntries) {
        allEntriesMap.set(entry.slug, entry)
      }
      const allEntries = Array.from(allEntriesMap.values())

      // Emit feed.xml (metaRSS entries)
      yield write({
        ctx,
        content: generateAtomFeed(cfg, metaRSSEntries, "feed", options),
        slug: "feed" as FullSlug,
        ext: ".xml",
      })

      // Emit links.xml (link entries)
      yield write({
        ctx,
        content: generateAtomFeed(cfg, linkEntries, "links", options),
        slug: "links" as FullSlug,
        ext: ".xml",
      })

      // Emit all.xml (union of both)
      yield write({
        ctx,
        content: generateAtomFeed(cfg, allEntries, "all", options),
        slug: "all" as FullSlug,
        ext: ".xml",
      })
    },
    externalResources: (ctx) => {
      return {
        additionalHead: [
          <link
            rel="alternate"
            type="application/atom+xml"
            title="Posts Feed"
            href={`https://${ctx.cfg.configuration.baseUrl}/feed.xml`}
          />,
          <link
            rel="alternate"
            type="application/atom+xml"
            title="Links Feed"
            href={`https://${ctx.cfg.configuration.baseUrl}/links.xml`}
          />,
        ],
      }
    },
  }
}
