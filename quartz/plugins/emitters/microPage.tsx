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
import MicroContent from "../../components/pages/MicroContent"
import { getDate } from "../../components/Date"

const POSTS_PER_PAGE = 20

export const MicroPage: QuartzEmitterPlugin = () => {
  // Create base opts for getQuartzComponents (without specific page)
  const baseOpts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: MicroContent({ page: 1, totalPages: 1 }), // Placeholder for component registration
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
    name: "MicroPage",
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

      // Get all micro posts with dates, sorted by date descending
      const microPosts = allFiles
        .filter((file) => file.slug?.startsWith("micro/") && !file.slug?.endsWith("/index"))
        .map((file) => ({ file, date: getDate(cfg, file) }))
        .filter((item) => item.date !== undefined)
        .sort((a, b) => b.date!.getTime() - a.date!.getTime())

      if (microPosts.length === 0) {
        return
      }

      const totalPages = Math.ceil(microPosts.length / POSTS_PER_PAGE)

      // Emit a page for each page number
      for (let page = 1; page <= totalPages; page++) {
        // First page is at /micro/, subsequent pages at /micro/2, /micro/3, etc.
        const slug = (page === 1 ? "micro" : `micro/${page}`) as FullSlug

        const opts: FullPageLayout = {
          ...sharedPageComponents,
          ...defaultListPageLayout,
          pageBody: MicroContent({ page, totalPages }),
        }

        const title = `Micro posts · Page ${page}`
        const [tree, vfile] = defaultProcessedContent({
          slug,
          text: "Micro posts",
          description: "Short thoughts and notes",
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
