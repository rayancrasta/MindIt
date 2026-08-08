import { useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

const markdownComponents: Components = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  a: ({ href, children, ...rest }) =>
    href && href.startsWith('/') ? (
      // Same-origin app links (e.g. /wiki/... or /item/...) navigate in-app instead of a full reload.
      <Link to={href} className="text-blue-600 hover:underline dark:text-blue-400" {...rest}>
        {children}
      </Link>
    ) : (
      <a
        href={href}
        className="text-blue-600 hover:underline dark:text-blue-400"
        target="_blank"
        rel="noreferrer"
        {...rest}
      >
        {children}
      </a>
    ),
  ul: (props) => <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mb-2 border-l-2 border-slate-300 pl-2 text-slate-500 italic last:mb-0 dark:border-slate-700 dark:text-slate-400"
      {...props}
    />
  ),
  pre: (props) => (
    <pre className="mb-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs last:mb-0 dark:bg-slate-800" {...props} />
  ),
  code: ({ className, ...props }) =>
    /language-/.test(className ?? '') ? (
      <code className={className} {...props} />
    ) : (
      <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] dark:bg-slate-800" {...props} />
    ),
  h1: (props) => <h4 className="mb-1 text-sm font-semibold" {...props} />,
  h2: (props) => <h4 className="mb-1 text-sm font-semibold" {...props} />,
  h3: (props) => <h4 className="mb-1 text-sm font-semibold" {...props} />,
};

export function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="text-sm text-slate-700 dark:text-slate-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function tabClass(active: boolean): string {
  return `px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? 'border-b-2 border-blue-500 text-slate-900 dark:text-white'
      : 'border-b-2 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
  }`;
}

export function MarkdownField({
  value,
  onChange,
  placeholder,
  rows = 4,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
      <div className="flex border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
        <button type="button" onClick={() => setTab('write')} className={tabClass(tab === 'write')}>
          Write
        </button>
        <button type="button" onClick={() => setTab('preview')} className={tabClass(tab === 'preview')}>
          Preview
        </button>
      </div>
      {tab === 'write' ? (
        <textarea
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-y rounded-b bg-transparent px-2 py-1.5 text-sm outline-none dark:bg-slate-800"
        />
      ) : (
        <div className="min-h-[4rem] px-2 py-1.5">
          {value.trim() ? <MarkdownBody text={value} /> : <p className="text-sm text-slate-400">Nothing to preview.</p>}
        </div>
      )}
    </div>
  );
}
