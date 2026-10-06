import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { api, THOUGHT_KINDS, type DeveloperThought, type ThoughtKind } from '../api';
import { KIND_STYLE } from './thoughtKinds';

interface Props {
  project: string;
  /** When set, the modal edits this thought instead of creating a new one. */
  thought?: DeveloperThought;
  onClose: () => void;
  onSaved: () => void;
}

const splitList = (text: string) =>
  text
    .split(/[,\s]+/)
    .map((s) => s.replace(/^#/, '').trim())
    .filter(Boolean);

export function ThoughtModal({ project, thought, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<ThoughtKind>(thought?.kind ?? 'thought');
  const [title, setTitle] = useState(thought?.title ?? '');
  const [body, setBody] = useState(thought?.body ?? '');
  const [tagsText, setTagsText] = useState(thought?.tags?.join(', ') ?? '');
  const [itemsText, setItemsText] = useState(thought?.items?.join(', ') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = { kind, title: title.trim(), body: body.trim(), tags: splitList(tagsText), items: splitList(itemsText) };
      if (thought) await api.thoughts.update(project, thought.id, data);
      else await api.thoughts.create(project, { ...data, title: data.title || undefined });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    if (e.key === 'Escape') onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10"
      >
        <h3 className="mb-4 text-base font-semibold">{thought ? 'Edit thought' : 'New thought'}</h3>

        <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
          {THOUGHT_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                kind === k
                  ? KIND_STYLE[k].chipActive
                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              <span aria-hidden>{KIND_STYLE[k].icon}</span>
              {k}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="input mb-3"
        />

        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="What are you thinking? Doubts, trade-offs, why you chose this… (markdown supported)"
          className="input mb-3 resize-y"
        />

        <div className="mb-1 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Tags</label>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="auth, caching" className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Related items</label>
            <input
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              placeholder="12, 15"
              className="input font-mono"
            />
          </div>
        </div>
        <p className="mb-3 text-xs text-neutral-400">Comma-separated. Items are feature/story/task/bug numbers.</p>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">⌘/Ctrl + Enter to save</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !body.trim()} className="btn-primary">
              {submitting ? 'Saving…' : thought ? 'Save changes' : 'Add thought'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
