import { cn } from "cn";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const plugins = [remarkGfm];

export function MarkdownContent({ text, className }: { text: string; className?: string }): React.JSX.Element {
  return (
    <div className={cn(
      "min-w-0 max-w-full break-words",
      "[&>*+*]:mt-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
      "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
      "[&_h1]:text-headline-md [&_h2]:text-title-sm [&_h3]:text-title-sm [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold",
      "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li+li]:mt-1",
      "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-body-sm",
      "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
      "[&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1",
      "[&_th]:text-left [&_hr]:border-border [&_input]:mr-1",
      className,
    )}>
      <Markdown
        remarkPlugins={plugins}
        skipHtml
        components={{
          img: ({ alt }) => <span>{alt}</span>,
          pre: ({ children }) => <pre className="max-w-full overflow-x-auto rounded-lg bg-muted p-3">{children}</pre>,
          table: ({ children }) => <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse">{children}</table></div>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
