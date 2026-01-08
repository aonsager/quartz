import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { FullSlug, pathToRoot } from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { defaultProcessedContent } from "../vfile"
import { write } from "./helpers"
import LinksContent from "../../components/pages/LinksContent"
import { getDate } from "../../components/Date"

const POSTS_PER_PAGE = 20

export const LinksPage: QuartzEmitterPlugin = () => {
  // Create base opts for getQuartzComponents (without specific page)
  const baseOpts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: LinksContent({ page: 1, totalPages: 1 }), // Placeholder for component registration
  }

  const {
    head: Head,
    header,
    beforeBody,
    pageBody,
    afterBody,
    left,
    right,
    footer: Footer,
  } = baseOpts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "LinksPage",
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
      const allFiles = content.map((c) => c[1].data)

      // Get all link posts with dates, sorted by date descending
      const linkPosts = allFiles
        .filter((file) => file.frontmatter?.link !== undefined)
        .map((file) => ({ file, date: getDate(cfg, file) }))
        .filter((item) => item.date !== undefined)
        .sort((a, b) => b.date!.getTime() - a.date!.getTime())

      if (linkPosts.length === 0) {
        return
      }

      const totalPages = Math.ceil(linkPosts.length / POSTS_PER_PAGE)

      // Emit a page for each page number
      for (let page = 1; page <= totalPages; page++) {
        // First page is at /links/, subsequent pages at /links/2, /links/3, etc.
        const slug = (page === 1 ? "links" : `links/${page}`) as FullSlug

        const opts: FullPageLayout = {
          ...sharedPageComponents,
          ...defaultListPageLayout,
          pageBody: LinksContent({ page, totalPages }),
        }

        const title = page === 1 ? "Links" : `Links · Page ${page}`
        const [tree, vfile] = defaultProcessedContent({
          slug,
          text: "Interesting links",
          description: "Interesting things that I have linked to",
          frontmatter: { title, tags: [] },
        })

        const externalResources = pageResources(pathToRoot(slug), resources)
        const componentData: QuartzComponentProps = {
          ctx,
          fileData: vfile.data,
          externalResources,
          cfg,
          children: [],
          tree,
          allFiles,
        }

        yield write({
          ctx,
          content: renderPage(cfg, slug, componentData, opts, externalResources),
          slug,
          ext: ".html",
        })
      }
    },
    async *partialEmit() {
      // Skip partial rebuild - regenerate on full build
    },
  }
}
