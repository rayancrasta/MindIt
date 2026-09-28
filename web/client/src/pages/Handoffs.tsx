import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SessionEntry } from '../api';
import { useProject } from '../context/ProjectContext';
import { MarkdownBody } from '../components/Markdown';
import { TouchedItems } from '../components/TouchedItems';
import { LogHandoffModal } from '../components/LogHandoffModal';

export function Handoffs() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const logQ = useQuery({
    queryKey: ['log', project],
    queryFn: () => api.log.list(project!, 30),
    enabled: !!project,
  });

  if (!project) {
    return <p className="text-neutral-500">Pick a project to see its handoff history.</p>;
  }

  const entries = logQ.data ?? [];

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['log', project] });
    qc.invalidateQueries({ queryKey: ['resume', project] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          What each session did, what's blocked, and what's next — for picking up exactly where it left off.
        </p>
        <button onClick={() => setModalOpen(true)} className="btn-primary shrink-0">
          + Log handoff
        </button>
      </div>

      {logQ.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-neutral-400">No handoffs logged yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <HandoffCard key={entry.timestamp} entry={entry} />
          ))}
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

function HandoffCard({ entry }: { entry: SessionEntry }) {
  return (
    <div className="card border-l-4 border-l-violet-500 p-3 text-sm dark:border-l-violet-400/70">
      <p className="mb-2 text-xs text-neutral-400">{new Date(entry.timestamp).toLocaleString()}</p>

      <div className="mb-2">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Done</span>
        <MarkdownBody text={entry.done} />
      </div>

      {entry.blockers && (
        <div className="mb-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Blockers</span>
          <MarkdownBody text={entry.blockers} />
        </div>
      )}

      {entry.next && (
        <div className="mb-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Next</span>
          <MarkdownBody text={entry.next} />
        </div>
      )}

      {entry.touchedItems && entry.touchedItems.length > 0 && (
        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Touched</span>
          <TouchedItems items={entry.touchedItems} />
        </div>
      )}
    </div>
  );
}
