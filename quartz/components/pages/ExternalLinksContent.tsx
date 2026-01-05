import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { FullSlug, resolveRelative } from "../../util/path"
import { Date as DateComponent } from "../Date"

interface ExternalLinkData {
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

export default (() => {
  const ExternalLinksContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { cfg, fileData } = props
    const links = ((props as any).externalLinks || []) as ExternalLinkData[]

    return (
      <div class="popover-hint">
        <article>
          <p>
            A chronological list of all external links from this site, ordered by the date they were
            first published.
          </p>
        </article>
        <div>
          {links.length > 0 ? (
            <ul class="section-ul">
              {links.map((link) => {
                const firstOccurrence = link.occurrences[0]

                return (
                  <li class="section-li">
                    <h3>
                      <a href={link.url} class="external" target="_blank" rel="noopener noreferrer">
                        {link.url}
                      </a>
                    </h3>
                    {firstOccurrence.context && (
                      <blockquote
                        dangerouslySetInnerHTML={{ __html: firstOccurrence.context }}
                      ></blockquote>
                    )}
                    <p>
                      <em>From: </em>
                      {link.occurrences.map((occurrence, idx) => (
                        <>
                          <a
                            href={resolveRelative(fileData.slug!, occurrence.sourcePage.slug)}
                            class="internal"
                          >
                            {occurrence.sourcePage.title}
                          </a>
                          {idx < link.occurrences.length - 1 && <span>, </span>}
                        </>
                      ))}
                      {link.earliestDate && (
                        <span class="meta">
                          {" "}
                          (<DateComponent date={link.earliestDate} locale={cfg.locale} />)
                        </span>
                      )}
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p>No external links found.</p>
          )}
        </div>
      </div>
    )
  }

  ExternalLinksContent.css = style

  return ExternalLinksContent
}) satisfies QuartzComponentConstructor
