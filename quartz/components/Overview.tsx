import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

export default (() => {
  const Overview: QuartzComponent = ({
    displayClass,
  }: QuartzComponentProps) => {
    return (
      <div class={classNames(displayClass, "overview")}>
        <div class="section">
          <h3>
            <a href="/posts">Posts</a>
          </h3>
          <p class="meta">Longer things I wrote</p>
        </div>
        <div class="section">
          <h3>
            <a href="/micro/">Micro</a>
          </h3>
          <p class="meta">
            My <del>tweets</del> toots
          </p>
        </div>
        <div class="section">
          <h3>
            <a href="/links">Links</a>
          </h3>
          <p class="meta">Things I liked</p>
        </div>
      </div>
    )
  }

  Overview.css = `
    .overview p.meta {
    	opacity: .6;
      margin: 0 0 1rem;
      font-style: italic;
    }
  `

  return Overview
}) satisfies QuartzComponentConstructor
