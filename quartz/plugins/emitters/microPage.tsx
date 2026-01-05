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

export const MicroPage: QuartzEmitterPlugin = () => {
  // Create base opts for getQuartzComponents (without specific year)
  const baseOpts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: MicroContent({ year: 0, allYears: [] }), // Placeholder for component registration
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

      // Get all micro posts and their years
      const microPosts = allFiles.filter(
        (file) => file.slug?.startsWith("micro/") && !file.slug?.endsWith("/index"),
      )

      const years = new Set<number>()
      for (const file of microPosts) {
        const date = getDate(cfg, file)
        if (date) {
          years.add(date.getFullYear())
        }
      }

      const allYears = Array.from(years).sort((a, b) => b - a)

      if (allYears.length === 0) {
        return
      }

      const latestYear = allYears[0]

      // Emit a page for each year
      for (const year of allYears) {
        const slug = `micro/${year}` as FullSlug

        const opts: FullPageLayout = {
          ...sharedPageComponents,
          ...defaultListPageLayout,
          pageBody: MicroContent({ year, allYears }),
        }

        const [tree, vfile] = defaultProcessedContent({
          slug,
          text: `Micro posts from ${year}`,
          description: `All micro posts from ${year}`,
          frontmatter: { title: `Micro · ${year}`, tags: [] },
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

      // Emit redirect page at /micro/ to latest year
      const microSlug = "micro/index" as FullSlug
      const redirectUrl = `./${latestYear}`
      yield write({
        ctx,
        content: `
          <!DOCTYPE html>
          <html lang="en-us">
          <head>
          <title>Micro</title>
          <link rel="canonical" href="${redirectUrl}">
          <meta name="robots" content="noindex">
          <meta charset="utf-8">
          <meta http-equiv="refresh" content="0; url=${redirectUrl}">
          </head>
          </html>
        `,
        slug: microSlug,
        ext: ".html",
      })
    },
    async *partialEmit() {
      // Skip partial rebuild - regenerate on full build
    },
  }
}
