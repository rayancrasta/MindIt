import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, THOUGHT_KINDS, type DeveloperThought, type ThoughtKind } from '../api';
import { useProject } from '../context/ProjectContext';
import { MarkdownBody } from '../components/Markdown';
import { TouchedItems } from '../components/TouchedItems';
import { ThoughtModal } from '../components/ThoughtModal';
import { ConfirmDialog, type ConfirmDialogState } from '../components/ConfirmDialog';
import { Timeline, formatTime } from '../components/Timeline';
import { KIND_STYLE } from '../components/thoughtKinds';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function Thoughts() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ThoughtKind | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<DeveloperThought | 'new' | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialogState | null>(null);
  const q = useDebounced(search.trim(), 250);

  const allQ = useQuery({
    queryKey: ['thoughts', project, 'all'],
    queryFn: () => api.thoughts.list(project!),
    enabled: !!project,
  });
  const filtered = !!(q || kind || tag);
  const listQ = useQuery({
    queryKey: ['thoughts', project, { q, kind, tag }],
    queryFn: () => api.thoughts.list(project!, { q: q || undefined, kind: kind ?? undefined, tag: tag ?? undefined }),
    enabled: !!project && filtered,
    placeholderData: keepPreviousData,
  });

  if (!project) {
    return <p className="text-neutral-500">Pick a project to see its developer thoughts.</p>;
  }

  const all = allQ.data ?? [];
  const thoughts = filtered ? (listQ.data ?? []) : all;
  const kindCounts = THOUGHT_KINDS.map((k) => [k, all.filter((t) => t.kind === k).length] as const);
  const tagCounts = new Map<string, number>();
  for (const t of all) for (const x of t.tags ?? []) tagCounts.set(x, (tagCounts.get(x) ?? 0) + 1);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['thoughts', project] });
  }

  function askDelete(t: DeveloperThought) {
    setConfirm({
      message: `Delete this ${t.kind}${t.title ? ` "${t.title}"` : ''}? This can't be undone.`,
      onConfirm: async () => {
        await api.thoughts.remove(project!, t.id);
        invalidate();
      },
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-500">
          Your running notes while building — doubts, decisions, ideas — so you (and Claude) can see how you were
          thinking, not just what got done.
        </p>
        <button onClick={() => setEditing('new')} className="btn-primary shrink-0">
          + New thought
        </button>
      </div>

      <div className="mb-5 space-y-3">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search thoughts…"
            className="input pl-8"
            aria-label="Search thoughts"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={kind === null} onClick={() => setKind(null)}>
            All <span className="opacity-60">{all.length}</span>
          </FilterChip>
          {kindCounts.map(([k, n]) => (
            <FilterChip
              key={k}
              active={kind === k}
              activeClass={KIND_STYLE[k].chipActive}
              onClick={() => setKind(kind === k ? null : k)}
              disabled={n === 0 && kind !== k}
            >
              <span aria-hidden>{KIND_STYLE[k].icon}</span>
              <span className="capitalize">{k}</span> <span className="opacity-60">{n}</span>
            </FilterChip>
          ))}
        </div>

        {topTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {topTags.map(([name, n]) => (
              <FilterChip key={name} small active={tag === name} onClick={() => setTag(tag === name ? null : name)}>
                #{name} <span className="opacity-60">{n}</span>
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {allQ.isLoading || (filtered && listQ.isLoading) ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : thoughts.length === 0 ? (
        <p className="text-sm text-neutral-400">
          {filtered ? 'No thoughts match those filters.' : 'No thoughts yet — jot down the first one.'}
        </p>
      ) : (
        <Timeline
          items={thoughts}
          getTime={(t) => t.created}
          getKey={(t) => t.id}
          dotClass={(t) => KIND_STYLE[t.kind].dot}
          render={(t) => (
            <ThoughtCard thought={t} onEdit={() => setEditing(t)} onDelete={() => askDelete(t)} onTag={setTag} />
          )}
        />
      )}

      {editing && (
        <ThoughtModal
          project={project}
          thought={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function FilterChip({
  active,
  activeClass = 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  small,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  activeClass?: string;
  small?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors disabled:opacity-40 ${
        small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${
        active
          ? activeClass
          : 'border-neutral-200 text-neutral-500 hover:bg-white dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}

function ThoughtCard({
  thought: t,
  onEdit,
  onDelete,
  onTag,
}: {
  thought: DeveloperThought;
  onEdit: () => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
}) {
  const style = KIND_STYLE[t.kind];
  return (
    <article className={`card group border-l-4 p-3 text-sm ${style.accent}`}>
      <header className="mb-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style.badge}`}>
          <span aria-hidden>{style.icon}</span>
          {t.kind}
        </span>
        <span className="text-xs text-neutral-400" title={new Date(t.created).toLocaleString()}>
          {formatTime(t.created)}
          {t.updated && <span title={`Edited ${new Date(t.updated).toLocaleString()}`}> · edited</span>}
        </span>
        <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <button onClick={onEdit} className="btn-ghost !px-2 !py-0.5 text-xs">
            Edit
          </button>
          <button onClick={onDelete} className="btn-ghost !px-2 !py-0.5 text-xs text-red-600 dark:text-red-400">
            Delete
          </button>
        </div>
      </header>

      {t.title && <h3 className="mb-1 text-sm font-semibold">{t.title}</h3>}
      <MarkdownBody text={t.body} />

      {((t.tags && t.tags.length > 0) || (t.touchedItems && t.touchedItems.length > 0)) && (
        <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {t.tags && t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTag(tag)}
                  className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
          {t.touchedItems && t.touchedItems.length > 0 && <TouchedItems items={t.touchedItems} />}
        </footer>
      )}
    </article>
  );
}
