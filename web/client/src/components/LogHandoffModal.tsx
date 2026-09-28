import { useState, type FormEvent } from 'react';
import { api } from '../api';

interface Props {
  project: string;
  onClose: () => void;
  onCreated: () => void;
}

export function LogHandoffModal({ project, onClose, onCreated }: Props) {
  const [done, setDone] = useState('');
  const [blockers, setBlockers] = useState('');
  const [next, setNext] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!done.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const items = itemsText
        .split(/[,\s]+/)
        .map((s) => s.replace(/^#/, '').trim())
        .filter(Boolean);
      await api.log.append(project, {
        done: done.trim(),
        blockers: blockers.trim() || undefined,
        next: next.trim() || undefined,
        items: items.length ? items : undefined,
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
        <h3 className="mb-4 text-base font-semibold">Log handoff</h3>

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          What was done this session
        </label>
        <textarea
          autoFocus
          value={done}
          onChange={(e) => setDone(e.target.value)}
          rows={3}
          className="input mb-3 resize-y"
        />

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Blockers (optional)
        </label>
        <input value={blockers} onChange={(e) => setBlockers(e.target.value)} className="input mb-3" />

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Next step (optional)
        </label>
        <input value={next} onChange={(e) => setNext(e.target.value)} className="input mb-3" />

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Items touched (optional)
        </label>
        <input
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          placeholder="12, 15, 23"
          className="input mb-1 font-mono"
        />
        <p className="mb-3 text-xs text-neutral-400">Feature/story/task/bug numbers, comma-separated.</p>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !done.trim()} className="btn-primary">
            {submitting ? 'Logging…' : 'Log handoff'}
          </button>
        </div>
      </form>
    </div>
  );
}
