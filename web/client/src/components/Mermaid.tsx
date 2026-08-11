import { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '../context/ThemeContext';

export function MermaidDiagram({ code }: { code: string }) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default' });
    const id = `mermaid-${crypto.randomUUID()}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch((err) => {
        if (!cancelled) {
          setSvg(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <p className="mb-1 font-medium">Couldn't render this diagram.</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return <p className="text-sm text-slate-400">Rendering…</p>;
  }

  // eslint-disable-next-line react/no-danger
  return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function tabClass(active: boolean): string {
  return `px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? 'border-b-2 border-blue-500 text-slate-900 dark:text-white'
      : 'border-b-2 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
  }`;
}

export function MermaidField({
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
          spellCheck={false}
          className="w-full resize-y rounded-b bg-transparent px-2 py-1.5 font-mono text-sm outline-none dark:bg-slate-800"
        />
      ) : (
        <div className="min-h-[4rem] px-2 py-1.5">
          {value.trim() ? (
            <MermaidDiagram code={value} />
          ) : (
            <p className="text-sm text-slate-400">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
