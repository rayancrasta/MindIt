import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { api, CONFIDENCE_LEVELS, type Assumption, type Confidence } from '../api';
import { CONFIDENCE_STYLE } from './confidenceStyle';

interface Props {
  project: string;
  /** When set, the modal edits this assumption instead of creating a new one. */
  assumption?: Assumption;
  onClose: () => void;
  onSaved: () => void;
}

const splitList = (text: string) =>
  text
    .split(/[,\s]+/)
    .map((s) => s.replace(/^#/, '').trim())
    .filter(Boolean);
// Wiki paths and code refs may contain spaces only rarely; split on commas/newlines for those.
const splitLines = (text: string) =>
  text
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const label = 'mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400';

export function AssumptionModal({ project, assumption: a, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(a?.title ?? '');
  const [confidence, setConfidence] = useState<Confidence>(a?.confidence ?? 'medium');
  const [body, setBody] = useState(a?.body ?? '');
  const [alternatives, setAlternatives] = useState(a?.alternatives ?? '');
  const [impact, setImpact] = useState(a?.impact ?? '');
  const [question, setQuestion] = useState(a?.question ?? '');
  const [tagsText, setTagsText] = useState(a?.tags?.join(', ') ?? '');
  const [itemsText, setItemsText] = useState(a?.items?.join(', ') ?? '');
  const [wikiText, setWikiText] = useState(a?.wiki?.join(', ') ?? '');
  const [refsText, setRefsText] = useState(a?.refs?.join(', ') ?? '');
  const [codeText, setCodeText] = useState(a?.code?.join(', ') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = {
        title: title.trim(),
        confidence,
        body,
        alternatives,
        impact,
        question,
        tags: splitList(tagsText),
        items: splitList(itemsText),
        wiki: splitLines(wikiText),
        refs: splitLines(refsText),
        code: splitLines(codeText),
      };
      if (a) await api.assumptions.update(project, a.id, data);
      else await api.assumptions.create(project, data);
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        onSubmit={submit}
        className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10"
      >
        <h3 className="mb-4 text-base font-semibold">{a ? 'Edit assumption' : 'New assumption'}</h3>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The assumption, in one line"
          className="input mb-3"
        />

        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Confidence">
          <span className="mr-1 text-xs text-neutral-500">Confidence</span>
          {CONFIDENCE_LEVELS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={confidence === c}
              onClick={() => setConfidence(c)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                confidence === c
                  ? CONFIDENCE_STYLE[c].chipActive
                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              <span aria-hidden>{CONFIDENCE_STYLE[c].icon}</span>
              {c}
            </button>
          ))}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Context: what was ambiguous, what was decided (markdown supported)"
          className="input mb-3 resize-y"
        />

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Alternatives considered</label>
            <textarea value={alternatives} onChange={(e) => setAlternatives(e.target.value)} rows={2} className="input resize-y" />
          </div>
          <div>
            <label className={label}>Impact if wrong</label>
            <textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} className="input resize-y" />
          </div>
        </div>
        <div className="mb-3">
          <label className={label}>Question for a human</label>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should someone confirm?" className="input" />
        </div>

        <div className="mb-1 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Tags</label>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="auth, caching" className="input" />
          </div>
          <div>
            <label className={label}>Related items</label>
            <input value={itemsText} onChange={(e) => setItemsText(e.target.value)} placeholder="12, 15" className="input font-mono" />
          </div>
          <div>
            <label className={label}>Wiki pages</label>
            <input value={wikiText} onChange={(e) => setWikiText(e.target.value)} placeholder="guides/auth" className="input" />
          </div>
          <div>
            <label className={label}>Code</label>
            <input value={codeText} onChange={(e) => setCodeText(e.target.value)} placeholder="src/auth.ts:42" className="input font-mono" />
          </div>
        </div>
        <div className="mb-1">
          <label className={label}>Specs / diagrams / schemas</label>
          <input
            value={refsText}
            onChange={(e) => setRefsText(e.target.value)}
            placeholder="spec:web:login, diagram:mermaid:auth-flow, schema:users"
            className="input font-mono"
          />
        </div>
        <p className="mb-3 text-xs text-neutral-400">Comma-separated. Items are feature/story/task/bug numbers.</p>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">⌘/Ctrl + Enter to save</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !title.trim()} className="btn-primary">
              {submitting ? 'Saving…' : a ? 'Save changes' : 'Add assumption'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
