import { useState, type FormEvent } from 'react';
import { api, type ItemType } from '../api';

interface Props {
  project: string;
  type: ItemType;
  parent?: string; // feature id for a story, story id for a task/bug
  onClose: () => void;
  onCreated: () => void;
}

const TITLES: Record<ItemType, string> = {
  feature: 'New feature',
  story: 'New story',
  task: 'New task',
  bug: 'New bug',
};

export function CreateItemModal({ project, type, parent, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const notesArg = notes.trim() || undefined;
      if (type === 'feature') {
        await api.features.create({ project, title: title.trim(), notes: notesArg });
      } else if (type === 'story') {
        await api.stories.create({ project, feature: parent!, title: title.trim(), notes: notesArg });
      } else if (type === 'task') {
        await api.tasks.create({ project, story: parent!, title: title.trim(), notes: notesArg });
      } else {
        await api.bugs.create({ project, story: parent, title: title.trim(), notes: notesArg });
      }
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
        <h3 className="mb-4 text-base font-semibold">{TITLES[type]}</h3>

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Title</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="input mb-3" />

        <label className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input mb-3 resize-y" />

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !title.trim()} className="btn-primary">
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
