import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, CONFIDENCE_LEVELS, type Assumption, type AssumptionStatus, type Confidence } from '../api';
import { useProject } from '../context/ProjectContext';
import { MarkdownBody } from '../components/Markdown';
import { TouchedItems } from '../components/TouchedItems';
import { AssumptionModal } from '../components/AssumptionModal';
import { AssumptionLinks } from '../components/AssumptionLinks';
import { ConfirmDialog, type ConfirmDialogState } from '../components/ConfirmDialog';
import { Timeline, formatTime } from '../components/Timeline';
import { CONFIDENCE_STYLE } from '../components/confidenceStyle';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function Assumptions() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Confidence | null>(null);
  const [status, setStatus] = useState<AssumptionStatus | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<Assumption | 'new' | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialogState | null>(null);
  const q = useDebounced(search.trim(), 250);

  const allQ = useQuery({
    queryKey: ['assumptions', project, 'all'],
    queryFn: () => api.assumptions.list(project!),
    enabled: !!project,
  });
  const filtered = !!(q || kind || tag || status);
  const listQ = useQuery({
    queryKey: ['assumptions', project, { q, kind, tag, status }],
    queryFn: () => api.assumptions.list(project!, { q: q || undefined, confidence: kind ?? undefined, status: status ?? undefined, tag: tag ?? undefined }),
    enabled: !!project && filtered,
    placeholderData: keepPreviousData,
  });

  if (!project) {
    return <p className="text-neutral-500">Pick a project to see its assumptions.</p>;
  }

  const all = allQ.data ?? [];
  const assumptions = filtered ? (listQ.data ?? []) : all;
  const openCount = all.filter((t) => t.status === 'open').length;
  const kindCounts = CONFIDENCE_LEVELS.map((k) => [k, all.filter((t) => t.confidence === k).length] as const);
  const tagCounts = new Map<string, number>();
  for (const t of all) for (const x of t.tags ?? []) tagCounts.set(x, (tagCounts.get(x) ?? 0) + 1);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['assumptions', project] });
  }

  async function review(a: Assumption, data: { note?: string; reopen?: boolean }) {
    await api.assumptions.review(project!, a.id, data);
    invalidate();
  }

  function askDelete(t: Assumption) {
    setConfirm({
      message: `Delete the assumption "${t.title}"? This can't be undone.`,
      onConfirm: async () => {
        await api.assumptions.remove(project!, t.id);
        invalidate();
      },
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-500">
          Calls the agent made without being sure — recorded so none slip through. Each links back to the work
          item, wiki page or code it affects; filter by confidence to review the shakiest first.
        </p>
        <button onClick={() => setEditing('new')} className="btn-primary shrink-0">
          + New assumption
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
            placeholder="Search assumptions…"
            className="input pl-8"
            aria-label="Search assumptions"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={status === null} onClick={() => setStatus(null)}>
            Any status
          </FilterChip>
          <FilterChip active={status === 'open'} onClick={() => setStatus(status === 'open' ? null : 'open')}>
            Unreviewed <span className="opacity-60">{openCount}</span>
          </FilterChip>
          <FilterChip active={status === 'reviewed'} onClick={() => setStatus(status === 'reviewed' ? null : 'reviewed')}>
            ✓ Reviewed <span className="opacity-60">{all.length - openCount}</span>
          </FilterChip>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={kind === null} onClick={() => setKind(null)}>
            All <span className="opacity-60">{all.length}</span>
          </FilterChip>
          {kindCounts.map(([k, n]) => (
            <FilterChip
              key={k}
              active={kind === k}
              activeClass={CONFIDENCE_STYLE[k].chipActive}
              onClick={() => setKind(kind === k ? null : k)}
              disabled={n === 0 && kind !== k}
            >
              <span aria-hidden>{CONFIDENCE_STYLE[k].icon}</span>
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
      ) : assumptions.length === 0 ? (
        <p className="text-sm text-neutral-400">
          {filtered ? 'No assumptions match those filters.' : 'No assumptions logged yet — agents record them via add_assumption.'}
        </p>
      ) : (
        <Timeline
          items={assumptions}
          getTime={(t) => t.created}
          getKey={(t) => t.id}
          dotClass={(t) => CONFIDENCE_STYLE[t.confidence].dot}
          render={(t) => (
            <AssumptionCard a={t} onReview={(note) => review(t, { note })} onReopen={() => review(t, { reopen: true })} onEdit={() => setEditing(t)} onDelete={() => askDelete(t)} onTag={setTag} />
          )}
        />
      )}

      {editing && (
        <AssumptionModal
          project={project}
          assumption={editing === 'new' ? undefined : editing}
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

function AssumptionCard({
  a,
  onReview,
  onReopen,
  onEdit,
  onDelete,
  onTag,
}: {
  a: Assumption;
  onReview: (note: string) => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
}) {
  const style = CONFIDENCE_STYLE[a.confidence];
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');
  const reviewed = a.status === 'reviewed';
  const hasLinks = !!(a.touchedItems?.length || a.wiki?.length || a.refs?.length || a.code?.length);
  return (
    <article className={`card group border-l-4 p-3 text-sm ${style.accent} ${reviewed ? 'opacity-70' : ''}`}>
      <header className="mb-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style.badge}`}>
          <span aria-hidden>{style.icon}</span>
          {a.confidence} confidence
        </span>
        {reviewed && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            ✓ Reviewed
          </span>
        )}
        <span className="text-xs text-neutral-400" title={new Date(a.created).toLocaleString()}>
          {formatTime(a.created)}
          {a.updated && <span title={`Edited ${new Date(a.updated).toLocaleString()}`}> · edited</span>}
        </span>
        <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          {reviewed ? (
            <button onClick={onReopen} className="btn-ghost !px-2 !py-0.5 text-xs">
              Reopen
            </button>
          ) : (
            <button onClick={() => setNoting(true)} className="btn-ghost !px-2 !py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              Mark reviewed
            </button>
          )}
          <button onClick={onEdit} className="btn-ghost !px-2 !py-0.5 text-xs">
            Edit
          </button>
          <button onClick={onDelete} className="btn-ghost !px-2 !py-0.5 text-xs text-red-600 dark:text-red-400">
            Delete
          </button>
        </div>
      </header>

      <h3 className="mb-1 text-sm font-semibold">{a.title}</h3>
      {a.body && <MarkdownBody text={a.body} />}

      {(a.alternatives || a.impact || a.question) && (
        <dl className="mt-2 space-y-1 text-xs">
          {a.question && (
            <div>
              <dt className="inline font-semibold text-rose-600 dark:text-rose-400">To confirm: </dt>
              <dd className="inline">{a.question}</dd>
            </div>
          )}
          {a.impact && (
            <div>
              <dt className="inline font-semibold text-neutral-500">Impact if wrong: </dt>
              <dd className="inline">{a.impact}</dd>
            </div>
          )}
          {a.alternatives && (
            <div>
              <dt className="inline font-semibold text-neutral-500">Alternatives: </dt>
              <dd className="inline">{a.alternatives}</dd>
            </div>
          )}
        </dl>
      )}

      {reviewed && a.reviewNote && (
        <p className="mt-2 rounded bg-emerald-500/5 px-2 py-1 text-xs text-emerald-800 dark:text-emerald-200">
          <span className="font-semibold">Review: </span>
          {a.reviewNote}
        </p>
      )}

      {noting && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onReview(note);
            setNoting(false);
            setNote('');
          }}
        >
          <input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setNoting(false)}
            placeholder="Outcome (optional) — e.g. confirmed, or what changed"
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">
            Mark reviewed
          </button>
          <button type="button" onClick={() => setNoting(false)} className="btn-ghost">
            Cancel
          </button>
        </form>
      )}

      {(a.tags?.length || hasLinks) && (
        <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {a.tags && a.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {a.tags.map((tag) => (
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
          {a.touchedItems && a.touchedItems.length > 0 && <TouchedItems items={a.touchedItems} />}
          <div className="flex flex-wrap gap-1.5">
            <AssumptionLinks a={a} />
          </div>
        </footer>
      )}
    </article>
  );
}
