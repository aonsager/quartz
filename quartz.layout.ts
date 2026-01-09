import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      Fediverse: "https://gts.invisibleparade.com/@alex",
      Email: "mailto:alex.onsager@gmail.com",
      Subscribe: "/feeds",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        // { Component: Component.ReaderMode() },
      ],
    }),
     Component.DesktopOnly(Component.Overview()),
    // Component.DesktopOnly(
      // Component.RecentNotes({
      //   showTags: false,
      //   filter: (node): boolean => {
      //     // only show pages with #meta-rss tag
      //     return Boolean(node.frontmatter?.metaRSS)
      //   },
      // }),
    // ),
    // Component.Explorer(
    //   {
    //     useSavedState: false,
    //   }
    // ),
  ],
  right: [
    //Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    // Component.TagList(),
    Component.Backlinks(),
  ],
  afterBody: [
    // Component.ContentMeta(),
    Component.RelatedPages(),
    Component.MobileOnly(Component.Overview()),
    // Component.MobileOnly(
    //   Component.RecentNotes({
    //     showTags: false,
    //     filter: (node): boolean => {
    //       // only show pages with #meta-rss tag
    //       return Boolean(node.frontmatter?.metaRSS)
    //     },
    //   }),
    // ),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.DesktopOnly(Component.Overview()),
    // Component.DesktopOnly(
    //   Component.RecentNotes({
    //     showTags: false,
    //     filter: (node): boolean => {
    //       // only show pages with #meta-rss tag
    //       return Boolean(node.frontmatter?.metaRSS)
    //     },
    //   }),
    // ),
    // Component.Explorer(
    //   {
    //     useSavedState: false,
    //   }
    // ),
  ],
  right: [],
  afterBody: [
  	Component.MobileOnly(Component.Overview()),
    // Component.MobileOnly(
    //   Component.RecentNotes({
    //     showTags: false,
    //     filter: (node): boolean => {
    //       // only show pages with #meta-rss tag
    //       return Boolean(node.frontmatter?.metaRSS)
    //     },
    //   }),
    // ),
  ],
}
