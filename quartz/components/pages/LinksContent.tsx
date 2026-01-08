import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { FilePath, FullSlug, resolveRelative, normalizeHastElement } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import { getDate } from "../Date"
import { GlobalConfiguration } from "../../cfg"
import { htmlToJsx } from "../../util/jsx"
import { Root, Element as HastElement } from "hast"

interface LinksContentOptions {
  page: number
  totalPages: number
}

interface LinkPost {
  slug: FullSlug
  title: string
  date: Date
  link: string
  htmlAst: Root
  filePath: FilePath
}

function formatFullDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function getTopLevelDomain(url: string): string {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

function getPostDate(cfg: GlobalConfiguration, fileData: QuartzPluginData): Date | undefined {
  return getDate(cfg, fileData)
}

function normalizeHtmlAst(tree: Root, curSlug: FullSlug, newSlug: FullSlug): Root {
  return {
    ...tree,
    children: tree.children.map((child) =>
      normalizeHastElement(child as HastElement, curSlug, newSlug),
    ),
  }
}

const POSTS_PER_PAGE = 20

export default ((opts: LinksContentOptions) => {
  const LinksContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { cfg, fileData, allFiles } = props
    const { page, totalPages } = opts

    // Get all link posts sorted by date (newest first)
    const allPosts: LinkPost[] = allFiles
      .filter((file) => file.frontmatter?.link !== undefined)
      .map((file) => ({
        slug: file.slug!,
        title: file.frontmatter?.title ?? "Untitled",
        date: getPostDate(cfg, file)!,
        link: file.frontmatter?.link as string,
        htmlAst: file.htmlAst!,
        filePath: file.filePath!,
      }))
      .filter((post) => post.date !== undefined && post.htmlAst !== undefined)
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    // Get posts for this page
    const startIndex = (page - 1) * POSTS_PER_PAGE
    const posts = allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)

    // Helper to get page URL
    const getPageUrl = (pageNum: number): FullSlug => {
      return pageNum === 1 ? ("links" as FullSlug) : (`links/${pageNum}` as FullSlug)
    }

    return (
      <div class="popover-hint">
        <ul class="section-ul">
          {posts.map((post) => {
            const normalizedAst = normalizeHtmlAst(post.htmlAst, fileData.slug!, post.slug)
            const content = htmlToJsx(post.filePath, normalizedAst)
            return (
              <li key={post.slug} class="section-li border-top">
                <h3>
                  <a href={post.link} class="external" target="_blank" rel="noopener noreferrer">
                    {post.title}
                  </a> <span class="meta">({getTopLevelDomain(post.link)})</span>
                </h3>
                {content && <div>{content}</div>}
                <p class="meta" style="text-align: right;">
                  <a href={resolveRelative(fileData.slug!, post.slug)} class="internal">
                    {formatFullDate(post.date, cfg.locale)}
                  </a>
                </p>
              </li>
            )
          })}
        </ul>

        {totalPages > 1 && (
          <p style="text-align: center; margin-top: 2rem;">
            {page > 1 && (
              <a
                href={resolveRelative(fileData.slug!, getPageUrl(page - 1))}
                class="internal"
              >
                ← Newer
              </a>
            )}
            {page > 1 && page < totalPages && " · "}
            {page < totalPages && (
              <a
                href={resolveRelative(fileData.slug!, getPageUrl(page + 1))}
                class="internal"
              >
                Older →
              </a>
            )}
          </p>
        )}
      </div>
    )
  }

  return LinksContent
}) satisfies QuartzComponentConstructor<LinksContentOptions>
