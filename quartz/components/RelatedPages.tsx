import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/relatedPages.scss"
import { resolveRelative, simplifySlug } from "../util/path"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"
import { getDate } from "./Date"

interface RelatedPagesOptions {
  title?: string
  limit: number
  hideWhenEmpty: boolean
}

const defaultOptions: RelatedPagesOptions = {
  limit: 5,
  hideWhenEmpty: true,
}

export default ((opts?: Partial<RelatedPagesOptions>) => {
  const options: RelatedPagesOptions = { ...defaultOptions, ...opts }

  const RelatedPages: QuartzComponent = ({
    fileData,
    allFiles,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    // Get current page tags
    const currentTags = new Set(fileData.frontmatter?.tags ?? [])

    // Skip if no tags
    if (currentTags.size === 0 && options.hideWhenEmpty) {
      return null
    }

    // Calculate tag overlap and filter/sort
    const slug = simplifySlug(fileData.slug!)
    const relatedPages = allFiles
      .filter((file) => simplifySlug(file.slug!) !== slug) // exclude self
      .map((file) => {
        const fileTags = new Set(file.frontmatter?.tags ?? [])
        const sharedTags = [...currentTags].filter((tag) => fileTags.has(tag))
        return { file, sharedTagCount: sharedTags.length }
      })
      .filter((item) => item.sharedTagCount > 0) // only pages with shared tags
      .sort((a, b) => {
        // Sort by shared tag count descending
        if (a.sharedTagCount !== b.sharedTagCount) {
          return b.sharedTagCount - a.sharedTagCount
        }
        // Then by date descending
        const dateA = a.file.dates ? getDate(cfg, a.file) : null
        const dateB = b.file.dates ? getDate(cfg, b.file) : null
        if (dateA && dateB) {
          return dateB.getTime() - dateA.getTime()
        }
        // Fallback to alphabetical
        const titleA = a.file.frontmatter?.title?.toLowerCase() ?? ""
        const titleB = b.file.frontmatter?.title?.toLowerCase() ?? ""
        return titleA.localeCompare(titleB)
      })
      .slice(0, options.limit)

    // Hide if no related pages
    if (options.hideWhenEmpty && relatedPages.length === 0) {
      return null
    }

    return (
      <div class={classNames(displayClass, "related-pages")}>
        <h3>{options.title ?? i18n(cfg.locale).components.relatedPages.title}</h3>
        <ul>
          {relatedPages.map(({ file }) => (
            <li>
              <a href={resolveRelative(fileData.slug!, file.slug!)} class="internal">
                {file.frontmatter?.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  RelatedPages.css = style

  return RelatedPages
}) satisfies QuartzComponentConstructor
