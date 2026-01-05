import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { FullSlug, resolveRelative } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import { getDate } from "../Date"
import { GlobalConfiguration } from "../../cfg"
import style from "../styles/listPage.scss"

function formatMonthDay(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

interface PostData {
  slug: FullSlug
  title: string
  date: Date
}

function getPostDate(cfg: GlobalConfiguration, fileData: QuartzPluginData): Date | undefined {
  return getDate(cfg, fileData)
}

export default (() => {
  const PostsContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { cfg, fileData, allFiles } = props

    // Filter to only metaRSS posts and collect post data
    const posts: PostData[] = allFiles
      .filter((file) => file.frontmatter?.metaRSS === true)
      .map((file) => ({
        slug: file.slug!,
        title: file.frontmatter?.title ?? "Untitled",
        date: getPostDate(cfg, file)!,
      }))
      .filter((post) => post.date !== undefined)
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    // Group posts by year
    const postsByYear = new Map<number, PostData[]>()
    for (const post of posts) {
      const year = post.date.getFullYear()
      if (!postsByYear.has(year)) {
        postsByYear.set(year, [])
      }
      postsByYear.get(year)!.push(post)
    }

    // Sort years descending
    const sortedYears = Array.from(postsByYear.keys()).sort((a, b) => b - a)

    return (
      <div class="popover-hint">
        {sortedYears.map((year) => (
          <div>
            <h2>{year}</h2>
            <ul class="section-ul">
              {postsByYear.get(year)!.map((post) => (
                <li class="section-li">
                  <div class="section">
                    <p class="meta">{formatMonthDay(post.date, cfg.locale)}</p>
                    <div class="desc">
                      <h3>
                        <a href={resolveRelative(fileData.slug!, post.slug)} class="internal">
                          {post.title}
                        </a>
                      </h3>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  PostsContent.css = style

  return PostsContent
}) satisfies QuartzComponentConstructor
