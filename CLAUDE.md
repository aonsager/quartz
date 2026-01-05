# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal wiki/digital garden built on **Quartz v4**, a static site generator that transforms Markdown notes into a website. The project syncs content from an Obsidian vault stored in iCloud and publishes it as a static website.

## Development Commands

### Building and Serving

```bash
# Build the site
npx quartz build

# Build and serve locally with hot reload
npx quartz build --serve

# Build using custom script (syncs from iCloud first)
./build.sh

# Build and serve using custom script
./build.sh --serve

# Build, serve, and push to remote
./build.sh --serve --push
```

### Other Commands

```bash
# Type check
npm run check

# Format code
npm run format

# Run tests
npm test

# Sync to/from GitHub
npx quartz sync

# Analyze tags across content
npm run analyze-tags
```

### Tag Analysis

The `npm run analyze-tags` command scans all content and generates a report at `tmp/tag-report.md` with:

- **Tag frequency**: All tags ranked by usage count
- **Potential duplicates**: Case variants, typos (Levenshtein distance), and plural forms
- **Underused tags**: Tags used only 1-2 times
- **Isolated pages**: Pages with low tag similarity to other pages (Jaccard metric)
- **Suggested additions**: Tags that frequently co-occur with existing tags

Options:
```bash
# Include micro posts (excluded by default)
npm run analyze-tags -- --include-micro

# Custom output path
npm run analyze-tags -- --output reports/tags.md

# Adjust isolation threshold (default: 0.2)
npm run analyze-tags -- --isolation-threshold 0.3
```

### Environment

- The `CONTENT_SOURCE` environment variable (defined in `.envrc`) points to the Obsidian vault in iCloud
- Uses direnv to automatically load environment variables
- The `build.sh` script rsyncs content from `$CONTENT_SOURCE` to the `content/` directory before building

## Architecture

### Plugin System

Quartz uses a three-phase plugin pipeline:

1. **Transformers** (`quartz/plugins/transformers/`): Process Markdown content during parsing
   - Examples: frontmatter parsing, syntax highlighting, link resolution, table of contents generation
   - Can provide `textTransform`, `markdownPlugins`, and `htmlPlugins` hooks
   - Transform raw markdown into processed AST

2. **Filters** (`quartz/plugins/filters/`): Determine which content gets published
   - Examples: draft removal, explicit content filtering
   - Return boolean from `shouldPublish()` method

3. **Emitters** (`quartz/plugins/emitters/`): Generate output files from processed content
   - Examples: content pages, folder pages, tag pages, RSS feeds, sitemaps
   - Can emit multiple files per invocation
   - Custom emitter `externalLinks.tsx` exists but appears incomplete

### Configuration Files

- **`quartz.config.ts`**: Main configuration
  - Site metadata (title, baseUrl, theme)
  - Plugin pipeline configuration
  - Theme colors (light/dark mode)
  - Analytics, locale settings

- **`quartz.layout.ts`**: Layout configuration
  - Defines which components appear on pages
  - `sharedPageComponents`: Components used across all pages (head, header, footer)
  - `defaultContentPageLayout`: Single page layout (note pages)
  - `defaultListPageLayout`: List page layout (tags, folders)
  - Components are arranged in regions: `beforeBody`, `left`, `right`, `afterBody`

### Build Process

1. Content is parsed from Markdown files in `content/` directory
2. Transformers process the markdown into an AST (Abstract Syntax Tree)
3. Filters determine what content to publish
4. Emitters generate HTML files and other assets into `public/` directory
5. Static resources (CSS, JS, images) are bundled and emitted

The build system uses:

- TypeScript with esbuild for bundling
- Unified/remark/rehype for markdown processing
- Preact for component rendering
- Workerpool for parallel processing

### Components

Located in `quartz/components/`, these are Preact components that render parts of the page:

- Layout components: `PageTitle`, `Header`, `Footer`, `Breadcrumbs`
- Content components: `ArticleTitle`, `TableOfContents`, `ContentMeta`
- Navigation: `Explorer`, `Search`, `Backlinks`, `Graph`
- Utilities: `Darkmode`, `MobileOnly`, `DesktopOnly`, `Flex`, `ConditionalRender`

Components receive `QuartzComponentProps` which includes file data, external resources, config, and the content tree.

### File Processing

- Content starts as Markdown in `content/`
- Processed using unified pipeline (remark → rehype → hast → html)
- Support for Obsidian-flavored Markdown and GitHub-flavored Markdown
- Math rendering via KaTeX
- Syntax highlighting via Shiki

### Custom Development Notes

- The site uses a custom `RecentNotes` component filter to only show pages tagged with `metaRSS`
- Custom color scheme defined in `quartz.config.ts` using OKLCH values
- Many default components (Graph, Explorer, Backlinks) are commented out in the layout
- CustomOgImages emitter is commented out to speed up build time

## Testing

Tests use Node.js built-in test runner (`node:test`):

- Test files: `quartz/util/*.test.ts`, `scripts/*.test.ts`
- Run with: `npm test` (uses tsx test runner)

## Branch Strategy

- Main development branch: `v4`
- Current branch: `main`
- When creating PRs, target the `main` branch
- All new feature development should be done on a new, separate branch. The user will manually review and merge.

## Development Strategy

- The folder `tmp/` may be used freely, such as creating one-off scripts to aid in development.
- When developing new features, create a file in `tmp/` to outline the overall strategy.
- When developing new features, always update documentation contained in the repository.
