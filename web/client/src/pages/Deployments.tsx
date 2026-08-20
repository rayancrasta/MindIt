import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, DEPLOYMENT_STATUSES, type DeploymentNote, type DeploymentStatus } from '../api';
import { useProject } from '../context/ProjectContext';
import { DEPLOYMENT_STATUS_BORDER, DeploymentStatusBadge } from '../components/DeploymentStatusBadge';
import { EnvironmentBadge } from '../components/EnvironmentBadge';
import { MarkdownBody } from '../components/Markdown';
import { LogDeploymentModal } from '../components/LogDeploymentModal';

const STATUS_LABELS: Record<DeploymentStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  rolled_back: 'Rolled back',
};

export function Deployments() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState<DeploymentStatus | ''>('');
  const [modalOpen, setModalOpen] = useState(false);

  const notesQ = useQuery({
    queryKey: ['deployments', project, environment, status],
    queryFn: () => api.deployments.list(project, environment || undefined, status || undefined),
    enabled: !!project,
  });

  if (!project) {
    return <p className="text-slate-500">Pick a project to see its deployment history.</p>;
  }

  const notes = notesQ.data ?? [];
  const environments = Array.from(new Set((notesQ.data ?? []).map((n) => n.environment))).sort();

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['deployments', project] });
    qc.invalidateQueries({ queryKey: ['resume', project] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Deployments — {project}</h2>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          + Log deployment
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Environment</span>
          <select
            aria-label="Filter by environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="input w-auto py-1 text-sm"
          >
            <option value="">All</option>
            {environments.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs font-medium text-slate-500">Status</span>
          <button
            onClick={() => setStatus('')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              status === '' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {DEPLOYMENT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                status === s ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {notesQ.isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-400">No deployments logged yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <DeploymentCard key={note.id} project={project} note={note} onChanged={invalidate} />
          ))}
        </div>
      )}

      {modalOpen && (
        <LogDeploymentModal
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

function DeploymentCard({
  project,
  note,
  onChanged,
}: {
  project: string;
  note: DeploymentNote;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [environment, setEnvironment] = useState(note.environment);
  const [status, setStatus] = useState<DeploymentStatus>(note.status);
  const [notesText, setNotesText] = useState(note.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setEnvironment(note.environment);
    setStatus(note.status);
    setNotesText(note.notes ?? '');
    setError(null);
    setEditing(true);
    setExpanded(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.deployments.update(project, note.id, {
        environment: environment.trim() || undefined,
        status,
        notes: notesText.trim(),
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    await api.deployments.remove(project, note.id);
    onChanged();
  }

  return (
    <div className={`card border-l-4 p-3 ${DEPLOYMENT_STATUS_BORDER[note.status]}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        <span
          className="inline-flex shrink-0 items-center justify-center text-slate-400 transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          aria-hidden
        >
          ▸
        </span>
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium dark:bg-slate-800">
          {note.commitHash}
        </code>
        <EnvironmentBadge environment={note.environment} />
        <DeploymentStatusBadge status={note.status} />
        <span className="ml-auto text-xs text-slate-400">{new Date(note.timestamp).toLocaleString()}</span>
      </button>

      {expanded && (
        <div className="mt-2 pl-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">by {note.deployedBy}</p>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={save} disabled={saving} className="btn-primary px-2.5 py-1 text-xs">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost px-2.5 py-1 text-xs">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={startEdit} className="btn-secondary px-2.5 py-1 text-xs">
                  Edit
                </button>
              )}
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="btn-danger-outline px-2.5 py-1 text-xs">
                  Delete
                </button>
              ) : (
                <>
                  <button onClick={doDelete} className="btn-danger px-2.5 py-1 text-xs">
                    Confirm
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="btn-ghost px-2.5 py-1 text-xs">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {editing && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Environment</label>
              <input
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="input w-32 py-0.5 text-xs"
              />
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select
                aria-label="Edit deployment status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DeploymentStatus)}
                className="input w-auto py-0.5 text-xs"
              >
                {DEPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

          {editing ? (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={3}
              className="input resize-y text-sm"
            />
          ) : note.notes ? (
            <MarkdownBody text={note.notes} />
          ) : (
            <p className="text-xs text-slate-400">No notes.</p>
          )}
        </div>
      )}
    </div>
  );
}
