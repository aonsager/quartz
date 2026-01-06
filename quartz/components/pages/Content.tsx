import { ComponentChildren } from "preact"
import { Date, getDate } from "./../Date"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const Content: QuartzComponent = (props: QuartzComponentProps) => {
	const { cfg, fileData, tree } = props
  const content = htmlToJsx(fileData.filePath!, tree) as ComponentChildren
  const date = fileData.frontmatter?.date as Date
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  return (
  	<article class={classString}>
   		{content}
     	<div class="post-meta">
    		<Date date={getDate(cfg, fileData)!} locale={cfg.locale} />
      </div>
   	</article>
  )
}

export default (() => Content) satisfies QuartzComponentConstructor
