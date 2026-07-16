"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Рендер на markdown тялото на статия със стил в духа на бранда.
export default function ArticleBody({ body }: { body: string }) {
  return (
    <div className="text-ink/80">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...p }: any) => (
            <h2 className="mt-8 font-display text-2xl font-semibold text-ink" {...p} />
          ),
          h2: ({ node, ...p }: any) => (
            <h2 className="mt-8 font-display text-2xl font-semibold text-ink" {...p} />
          ),
          h3: ({ node, ...p }: any) => (
            <h3 className="mt-6 font-display text-xl font-semibold text-ink" {...p} />
          ),
          p: ({ node, ...p }: any) => <p className="mt-4 leading-relaxed" {...p} />,
          ul: ({ node, ...p }: any) => <ul className="mt-4 list-disc space-y-1.5 pl-5" {...p} />,
          ol: ({ node, ...p }: any) => <ol className="mt-4 list-decimal space-y-1.5 pl-5" {...p} />,
          li: ({ node, ...p }: any) => <li className="leading-relaxed" {...p} />,
          a: ({ node, ...p }: any) => (
            <a className="text-brand-600 underline underline-offset-2 hover:text-brand" {...p} />
          ),
          strong: ({ node, ...p }: any) => <strong className="font-semibold text-ink" {...p} />,
          blockquote: ({ node, ...p }: any) => (
            <blockquote className="mt-4 border-l-2 border-gold pl-4 italic text-muted" {...p} />
          ),
          hr: () => <hr className="my-8 border-ink/10" />,
          table: ({ node, ...p }: any) => (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: ({ node, ...p }: any) => (
            <th className="border-b border-ink/20 px-2 py-1.5 text-left font-medium text-ink" {...p} />
          ),
          td: ({ node, ...p }: any) => <td className="border-b border-ink/10 px-2 py-1.5" {...p} />,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
