import { useEffect, useRef, useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SessionEntry } from '../api';
import { useProject } from '../context/ProjectContext';
import { MarkdownBody } from '../components/Markdown';
import { TouchedItems } from '../components/TouchedItems';
import { LogHandoffModal } from '../components/LogHandoffModal';
import { Timeline, formatDay, formatTime, timeAgo } from '../components/Timeline';

const HISTORY_LIMIT = 500;

export function Handoffs() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [blockersOnly, setBlockersOnly] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const logQ = useQuery({
    queryKey: ['log', project, q],
    queryFn: () => api.log.list(project!, HISTORY_LIMIT, q || undefined),
    enabled: !!project,
    placeholderData: keepPreviousData,
  });

  if (!project) {
    return <p className="text-neutral-500">Pick a project to see its handoff history.</p>;
  }

  const all = logQ.data ?? [];
  const entries = blockersOnly ? all.filter((e) => e.blockers) : all;
  const latest = !q && !blockersOnly ? all[0] : undefined;
  const history = latest ? entries.slice(1) : entries;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['log', project] });
    qc.invalidateQueries({ queryKey: ['resume', project] });
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-500">
          What each session did, what's blocked, and what's next — for picking up exactly where it left off.
        </p>
        <button onClick={() => setModalOpen(true)} className="btn-primary shrink-0">
          + Log handoff
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
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
            placeholder="Search handoffs…"
            className="input pl-8"
            aria-label="Search handoffs"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={blockersOnly}
            onChange={(e) => setBlockersOnly(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 accent-violet-600"
          />
          Blockers only
        </label>
        {all.length > 0 && (
          <span className="text-xs text-neutral-400">
            {entries.length} handoff{entries.length === 1 ? '' : 's'}
            {q || blockersOnly ? ' match' : ` · since ${formatDay(all[all.length - 1].timestamp)}`}
          </span>
        )}
      </div>

      {logQ.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-neutral-400">
          {q || blockersOnly ? 'No handoffs match those filters.' : 'No handoffs logged yet.'}
        </p>
      ) : (
        <div className="space-y-8">
          {latest && <LatestHandoff entry={latest} />}
          {history.length > 0 && (
            <div>
              {latest && (
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Earlier</h2>
              )}
              <Timeline
                items={history}
                getTime={(e) => e.timestamp}
                getKey={(e) => e.timestamp}
                dotClass={(e) => (e.blockers ? 'bg-amber-500' : 'bg-violet-500')}
                render={(e) => <HandoffCard entry={e} />}
              />
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <LogHandoffModal
          project={project}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

/** The most recent handoff, set apart as the place to pick up from. */
function LatestHandoff({ entry }: { entry: SessionEntry }) {
  return (
    <section className="card overflow-hidden border-violet-300/60 bg-gradient-to-br from-violet-50/80 to-white p-4 dark:border-violet-500/30 dark:from-violet-500/10 dark:to-neutral-800">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-violet-500">
          Pick up here
        </span>
        <span className="text-xs text-neutral-500" title={new Date(entry.timestamp).toLocaleString()}>
          Last session {timeAgo(entry.timestamp)} · {formatDay(entry.timestamp)}, {formatTime(entry.timestamp)}
        </span>
      </div>
      <HandoffBody entry={entry} />
    </section>
  );
}

function HandoffCard({ entry }: { entry: SessionEntry }) {
  return (
    <article className="card p-3 text-sm">
      <p className="mb-2 text-xs text-neutral-400" title={new Date(entry.timestamp).toLocaleString()}>
        {formatTime(entry.timestamp)} · {timeAgo(entry.timestamp)}
      </p>
      <HandoffBody entry={entry} />
    </article>
  );
}

function HandoffBody({ entry }: { entry: SessionEntry }) {
  return (
    <div className="space-y-3 text-sm">
      <Section label="Done" accent="text-violet-600 dark:text-violet-300">
        <Collapsible>
          <MarkdownBody text={entry.done} />
        </Collapsible>
      </Section>

      {(entry.blockers || entry.next) && (
        <div className={`grid gap-3 ${entry.blockers && entry.next ? 'md:grid-cols-2' : ''}`}>
          {entry.blockers && (
            <Callout
              label="Blockers"
              tone="border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <MarkdownBody text={entry.blockers} />
            </Callout>
          )}
          {entry.next && (
            <Callout
              label="Next"
              tone="border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <MarkdownBody text={entry.next} />
            </Callout>
          )}
        </div>
      )}

      {entry.touchedItems && entry.touchedItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Touched</span>
          <TouchedItems items={entry.touchedItems} />
        </div>
      )}
    </div>
  );
}

function Section({ label, accent, children }: { label: string; accent: string; children: ReactNode }) {
  return (
    <div>
      <span className={`mb-0.5 block text-xs font-semibold uppercase tracking-wide ${accent}`}>{label}</span>
      {children}
    </div>
  );
}

function Callout({ label, tone, children }: { label: string; tone: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border p-2.5 ${tone}`}>
      <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide">{label}</span>
      <div className="text-neutral-800 dark:text-neutral-200">{children}</div>
    </div>
  );
}

const COLLAPSED_HEIGHT = 128;

/** Clamps tall content with a fade and a Show more toggle; short content renders as-is. */
function Collapsible({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ref.current) setTall(ref.current.scrollHeight > COLLAPSED_HEIGHT + 24);
  }, [children]);

  return (
    <div>
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={tall && !open ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
      >
        {children}
        {tall && !open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent dark:from-neutral-800" />
        )}
      </div>
      {tall && (
        <button onClick={() => setOpen(!open)} className="btn-link mt-1">
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
