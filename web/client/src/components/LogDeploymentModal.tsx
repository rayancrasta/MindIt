import { useState, type FormEvent } from 'react';
import { api, DEPLOYMENT_STATUSES, type DeploymentStatus } from '../api';

interface Props {
  project: string;
  onClose: () => void;
  onCreated: () => void;
}

const STATUS_LABELS: Record<DeploymentStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  rolled_back: 'Rolled back',
};

const ENVIRONMENTS = ['production', 'staging', 'development', 'preview'];

export function LogDeploymentModal({ project, onClose, onCreated }: Props) {
  const [commitHash, setCommitHash] = useState('');
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState<DeploymentStatus>('success');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!commitHash.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.deployments.create({
        project,
        commitHash: commitHash.trim(),
        environment: environment.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10"
      >
        <h3 className="mb-4 text-base font-semibold">Log deployment</h3>

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Commit hash</label>
        <input
          autoFocus
          value={commitHash}
          onChange={(e) => setCommitHash(e.target.value)}
          placeholder="a1b2c3d"
          className="input mb-3 font-mono"
        />

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Environment (optional)
        </label>
        <input
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          placeholder="production"
          list="deployment-environments"
          className="input mb-3"
        />
        <datalist id="deployment-environments">
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env} />
          ))}
        </datalist>

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Status</label>
        <select
          aria-label="Deployment status"
          value={status}
          onChange={(e) => setStatus(e.target.value as DeploymentStatus)}
          className="input mb-3"
        >
          {DEPLOYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input mb-3 resize-y" />

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !commitHash.trim()} className="btn-primary">
            {submitting ? 'Logging…' : 'Log deployment'}
          </button>
        </div>
      </form>
    </div>
  );
}
