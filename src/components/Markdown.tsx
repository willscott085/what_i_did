import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, node: _, ...props }) =>
            href ? (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/70 hover:text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          p: ({ children }) => (
            <p className="my-1 first:mt-0 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-1 list-disc pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 list-decimal pl-4">{children}</ol>
          ),
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mt-2 mb-1 text-base font-bold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-2 mb-1 text-sm font-bold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-1 mb-0.5 text-sm font-semibold">{children}</h3>
          ),
          code: ({ children, node }) =>
            node?.position &&
            node.position.start.line !== node.position.end.line ? (
              <code className="bg-muted block overflow-x-auto rounded p-2 text-xs">
                {children}
              </code>
            ) : (
              <code className="bg-muted rounded px-1 py-0.5 text-xs">
                {children}
              </code>
            ),
          pre: ({ children }) => <pre className="my-1">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-muted-foreground/30 my-1 border-l-2 pl-3 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-2" />,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          del: ({ children }) => <del className="opacity-60">{children}</del>,
          table: ({ children }) => (
            <table className="my-1 w-full text-xs">{children}</table>
          ),
          th: ({ children }) => (
            <th className="border-border border-b px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-border border-b px-2 py-1">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
