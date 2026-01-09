import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  const colors = fileData.frontmatter?.colors as Array<string>
  var flairColors = undefined
	if (colors && colors.length > 0) {
		flairColors = `background-image: linear-gradient(90deg, ${colors.join(", ")});`
	}
  const link = fileData.frontmatter?.link as string | undefined
  if (title) {
   	return (
    	<div>
  		{flairColors ? 
    		<div class="post-flair" style={flairColors}></div> :
        ""
     	}
 			<h1 class={classNames(displayClass, "article-title")}>{title}</h1>
     	{link ?
    		<div class="post-link"><a href={link}>{link}</a></div> :
       	""
     	}
     	</div>	
   	)
  } else {
    return null
  }
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}

.post-flair {
	width: 100%;
	height: 5px;
	margin-top: 2rem;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
