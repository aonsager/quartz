import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { FilePath, FullSlug, resolveRelative } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import { getDate } from "../Date"
import { GlobalConfiguration } from "../../cfg"
import { htmlToJsx } from "../../util/jsx"
import { Root } from "hast"

interface MicroContentOptions {
  year: number
  allYears: number[]
}

interface MicroPost {
  slug: FullSlug
  date: Date
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

function getPostDate(cfg: GlobalConfiguration, fileData: QuartzPluginData): Date | undefined {
  return getDate(cfg, fileData)
}

export default ((opts: MicroContentOptions) => {
  const MicroContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { cfg, fileData, allFiles } = props
    const { year, allYears } = opts

    // Filter to only micro posts for this year
    const posts: MicroPost[] = allFiles
      .filter((file) => file.slug?.startsWith("micro/") && !file.slug?.endsWith("/index"))
      .map((file) => ({
        slug: file.slug!,
        date: getPostDate(cfg, file)!,
        htmlAst: file.htmlAst!,
        filePath: file.filePath!,
      }))
      .filter((post) => post.date !== undefined && post.htmlAst !== undefined)
      .filter((post) => post.date.getFullYear() === year)
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    // Sort years descending for navigation
    const sortedYears = [...allYears].sort((a, b) => b - a)

    return (
      <div class="popover-hint">
        <p>
          {sortedYears.map((y, idx) => (
            <span key={y}>
              {y === year ? (
                <strong>{y}</strong>
              ) : (
                <a
                  href={resolveRelative(fileData.slug!, `micro/${y}` as FullSlug)}
                  class="internal"
                >
                  {y}
                </a>
              )}
              {idx !== sortedYears.length - 1 && " · "}
            </span>
          ))}
        </p>

        <ul class="section-ul">
          {posts.map((post) => {
            const content = htmlToJsx(post.filePath, post.htmlAst)
            return (
              <li key={post.slug} class="section-li">
                <p class="meta">
                  <a href={resolveRelative(fileData.slug!, post.slug)} class="internal">
                    {formatFullDate(post.date, cfg.locale)}
                  </a>
                </p>
                {content && <div>{content}</div>}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return MicroContent
}) satisfies QuartzComponentConstructor<MicroContentOptions>
