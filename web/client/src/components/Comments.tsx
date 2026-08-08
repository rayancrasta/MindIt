import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, type Comment } from '../api';
import { MarkdownBody, MarkdownField } from './Markdown';

const AUTHOR_KEY = 'work-tracker:comment-author';

export function Comments({ itemId, comments }: { itemId: string; comments: Comment[] }) {
  const qc = useQueryClient();
  const [authorDraft, setAuthorDraft] = useState(() => localStorage.getItem(AUTHOR_KEY) ?? '');
  const [newText, setNewText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['item', itemId] });
  }

  async function submitNew() {
    const text = newText.trim();
    if (!text) return;
    const author = authorDraft.trim();
    if (author) localStorage.setItem(AUTHOR_KEY, author);
    setPosting(true);
    try {
      await api.items.comments.add(itemId, { text, author: author || undefined });
      setNewText('');
      invalidate();
    } finally {
      setPosting(false);
    }
  }

  function startEdit(c: Comment) {
    setConfirmDeleteId(null);
    setEditingId(c.id);
    setEditText(c.text);
  }

  async function saveEdit(commentId: string) {
    const text = editText.trim();
    if (!text) return;
    await api.items.comments.update(itemId, commentId, text);
    setEditingId(null);
    invalidate();
  }

  async function doDelete(commentId: string) {
    await api.items.comments.remove(itemId, commentId);
    setConfirmDeleteId(null);
    invalidate();
  }

  const sorted = [...comments].sort((a, b) => a.created.localeCompare(b.created));

  return (
    <div className="mb-6">
      <label className="mb-1 block text-sm font-medium text-slate-500">
        Comments{comments.length > 0 && <span className="ml-1 font-normal text-slate-400">({comments.length})</span>}
      </label>

      {sorted.length > 0 && (
        <ul className="mb-3 space-y-3">
          {sorted.map((c) => (
            <li key={c.id} className="card p-2.5">
              <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  {(c.author || '?').trim().charAt(0).toUpperCase()}
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">{c.author}</span>
                <span>{new Date(c.created).toLocaleString()}</span>
                {c.updated && (
                  <span className="italic" title={`Edited ${new Date(c.updated).toLocaleString()}`}>
                    (edited)
                  </span>
                )}
                <div className="ml-auto flex gap-2.5">
                  {editingId !== c.id && (
                    <button onClick={() => startEdit(c)} className="hover:text-blue-600 dark:hover:text-blue-400">
                      Edit
                    </button>
                  )}
                  {confirmDeleteId === c.id ? (
                    <>
                      <span>Delete?</span>
                      <button onClick={() => doDelete(c.id)} className="text-red-600 hover:underline">
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    editingId !== c.id && (
                      <button onClick={() => setConfirmDeleteId(c.id)} className="hover:text-red-600">
                        Delete
                      </button>
                    )
                  )}
                </div>
              </div>
              {editingId === c.id ? (
                <div>
                  <MarkdownField value={editText} onChange={setEditText} rows={4} autoFocus />
                  <div className="mt-1.5 flex gap-2">
                    <button onClick={() => saveEdit(c.id)} disabled={!editText.trim()} className="btn-primary px-2.5 py-1 text-xs">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost px-2.5 py-1 text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <MarkdownBody text={c.text} />
              )}
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          value={authorDraft}
          onChange={(e) => setAuthorDraft(e.target.value)}
          placeholder="Your name (optional)"
          className="input mb-1.5 w-48 py-1 text-xs"
        />
        <MarkdownField
          value={newText}
          onChange={setNewText}
          placeholder="Add a comment… (markdown supported)"
          rows={3}
        />
        <div className="mt-1.5">
          <button onClick={submitNew} disabled={!newText.trim() || posting} className="btn-primary">
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
