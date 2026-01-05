import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { FullSlug, pathToRoot } from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { defaultProcessedContent } from "../vfile"
import { write } from "./helpers"
import PostsContent from "../../components/pages/PostsContent"

export const PostsPage: QuartzEmitterPlugin = () => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: PostsContent(),
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Body = BodyConstructor()

  return {
    name: "PostsPage",
    getQuartzComponents() {
      return [
        Head,
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
      const slug = "posts" as FullSlug

      const [tree, vfile] = defaultProcessedContent({
        slug,
        text: "All blog posts",
        description: "All posts on this site",
        frontmatter: { title: "All blog posts", tags: [] },
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
      }

      yield write({
        ctx,
        content: renderPage(cfg, slug, componentData, opts, externalResources),
        slug,
        ext: ".html",
      })
    },
    async *partialEmit() {
      // Skip partial rebuild - regenerate on full build
    },
  }
}
