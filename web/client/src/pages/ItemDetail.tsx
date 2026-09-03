import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, isDone, ITEM_STATUSES, type Bug, type ItemStatus, type Story, type Task } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { ItemTypeBadge } from '../components/ItemTypeBadge';
import { Comments } from '../components/Comments';
import { MarkdownBody, MarkdownField } from '../components/Markdown';

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingForce, setConfirmingForce] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['item', id],
    queryFn: () => api.items.get(id!),
    enabled: !!id,
  });

  if (!id) return null;
  if (isLoading) return <p className="text-neutral-500">Loading…</p>;
  if (error || !data) {
    return <p className="text-red-600">{error instanceof Error ? error.message : `Item ${id} not found.`}</p>;
  }

  const { type, project, item } = data;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['item', id] });
    qc.invalidateQueries({ queryKey: ['features', project] });
    qc.invalidateQueries({ queryKey: ['stories', project] });
    qc.invalidateQueries({ queryKey: ['tasks', project] });
    qc.invalidateQueries({ queryKey: ['bugs', project] });
    qc.invalidateQueries({ queryKey: ['resume', project] });
    qc.invalidateQueries({ queryKey: ['status', project] });
  }

  async function updateStatus(status: ItemStatus) {
    await api.items.update(item.id, { status });
    invalidate();
  }

  async function saveTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    setTitleDraft(null);
    if (!trimmed || trimmed === item.title) return;
    await api.items.update(item.id, { title: trimmed });
    invalidate();
  }

  async function saveNotes() {
    if (notesDraft === null) return;
    const value = notesDraft;
    setNotesDraft(null);
    if (value === (item.notes ?? '')) return;
    await api.items.update(item.id, { notes: value });
    invalidate();
  }

  function cancelNotes() {
    setNotesDraft(null);
  }

  async function doDelete(force: boolean) {
    setDeleteError(null);
    try {
      await api.items.remove(item.id, force);
      invalidate();
      navigate('/backlog');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConfirmingForce(true);
        setDeleteError(err.message);
      } else {
        setDeleteError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  async function addLink() {
    const other = linkInput.trim();
    if (!other) return;
    await api.stories.link(item.id, other);
    setLinkInput('');
    invalidate();
  }

  async function removeLink(other: string) {
    await api.stories.unlink(item.id, other);
    invalidate();
  }

  const parentId =
    type === 'story' ? (item as Story).feature : type === 'task' || type === 'bug' ? (item as Task | Bug).story : undefined;
  const showNotesContent = !notesCollapsed || notesDraft !== null;
  const isStory = type === 'story';

  const mainContent = (
    <>
      <div className="mb-4 flex items-center gap-2">
        <ItemTypeBadge type={type} id={item.id} />
        <StatusBadge status={item.status} />
        {parentId && (
          <Link to={`/item/${parentId}`} className="ml-auto text-sm text-blue-600 hover:underline dark:text-blue-400">
            ↑ parent #{parentId}
          </Link>
        )}
      </div>

      {titleDraft === null ? (
        <h1
          onClick={() => setTitleDraft(item.title)}
          className="-mx-1.5 mb-4 cursor-text rounded-lg px-1.5 py-0.5 text-2xl font-semibold tracking-tight transition-colors hover:bg-neutral-100/70 dark:hover:bg-neutral-700/50"
          title="Click to edit"
        >
          {item.title}
        </h1>
      ) : (
        <input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
          className="input mb-4 text-2xl font-semibold"
        />
      )}

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-neutral-500">Status</label>
        <select
          value={item.status}
          onChange={(e) => updateStatus(e.target.value as ItemStatus)}
          className="input w-auto py-1"
        >
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 text-xs text-neutral-400">
        Created {new Date(item.created).toLocaleString()} · Updated {new Date(item.updated).toLocaleString()} · Project{' '}
        {project}
      </div>

      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between">
          <button
            onClick={() => setNotesCollapsed((c) => !c)}
            className="flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <span className={`inline-block text-[10px] transition-transform ${notesCollapsed ? '-rotate-90' : ''}`}>
              ▾
            </span>
            Notes
          </button>
          {showNotesContent && notesDraft === null && (item.notes ?? '').trim() && (
            <button onClick={() => setNotesDraft(item.notes ?? '')} className="btn-link">
              Edit
            </button>
          )}
        </div>
        {showNotesContent &&
          (notesDraft !== null || !(item.notes ?? '').trim() ? (
            <div>
              <MarkdownField
                value={notesDraft ?? item.notes ?? ''}
                onChange={setNotesDraft}
                placeholder="No notes yet… (markdown supported)"
                rows={6}
                autoFocus={notesDraft !== null}
              />
              {notesDraft !== null && (
                <div className="mt-1.5 flex gap-2">
                  <button onClick={saveNotes} className="btn-primary px-2.5 py-1 text-xs">
                    Save
                  </button>
                  <button onClick={cancelNotes} className="btn-ghost px-2.5 py-1 text-xs">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card px-3 py-2">
              <MarkdownBody text={item.notes ?? ''} />
            </div>
          ))}
      </div>

      {type === 'feature' && <ChildrenList type={type} parentId={item.id} project={project} />}

      {type === 'story' && (
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-neutral-500">Related stories</label>
          <ul className="mb-2 space-y-1">
            {(item as Story).links?.length ? (
              (item as Story).links!.map((l) => (
                <li key={l} className="flex items-center gap-2 text-sm">
                  <Link to={`/item/${l}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    #{l}
                  </Link>
                  <button onClick={() => removeLink(l)} className="text-xs text-neutral-400 hover:text-red-600">
                    unlink
                  </button>
                </li>
              ))
            ) : (
              <li className="text-sm text-neutral-400">No linked stories.</li>
            )}
          </ul>
          <div className="flex gap-2">
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Story # to link"
              className="input w-40"
            />
            <button onClick={addLink} className="btn-secondary">
              Link
            </button>
          </div>
        </div>
      )}

      <Comments itemId={item.id} comments={item.comments ?? []} />

      <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
        {deleteError && <p className="mb-2 text-sm text-red-600">{deleteError}</p>}
        {!confirmingForce ? (
          <button onClick={() => doDelete(false)} className="btn-danger-outline">
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => doDelete(true)} className="btn-danger">
              Force delete anyway
            </button>
            <button
              onClick={() => {
                setConfirmingForce(false);
                setDeleteError(null);
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`mx-auto ${isStory ? 'max-w-7xl' : 'max-w-2xl'}`}>
      {isStory ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-start">
          <div className="min-w-0">{mainContent}</div>
          <div className="lg:sticky lg:top-4">
            <ChildrenList type="story" parentId={item.id} project={project} panel />
          </div>
        </div>
      ) : (
        mainContent
      )}
    </div>
  );
}

function ChildrenList({
  type,
  parentId,
  project,
  panel,
}: {
  type: 'feature' | 'story';
  parentId: string;
  project: string;
  panel?: boolean;
}) {
  const qc = useQueryClient();
  const tasksKey = ['tasks', project, 'byStory', parentId];
  const bugsKey = ['bugs', project, 'byStory', parentId];

  const storiesQ = useQuery({
    queryKey: ['stories', project, 'byFeature', parentId],
    queryFn: () => api.stories.list(project, undefined, parentId),
    enabled: type === 'feature',
  });
  const tasksQ = useQuery({
    queryKey: tasksKey,
    queryFn: () => api.tasks.list(project, undefined, parentId),
    enabled: type === 'story',
  });
  const bugsQ = useQuery({
    queryKey: bugsKey,
    queryFn: () => api.bugs.list(project, undefined, parentId),
    enabled: type === 'story',
  });

  const children = type === 'feature' ? storiesQ.data ?? [] : [...(tasksQ.data ?? []), ...(bugsQ.data ?? [])];
  const done = children.filter((c) => isDone(c.status)).length;

  async function toggleDone(c: Task | Bug) {
    const status = isDone(c.status) ? 'new' : 'closed';
    await api.items.update(c.id, { status });
    qc.invalidateQueries({ queryKey: tasksKey });
    qc.invalidateQueries({ queryKey: bugsKey });
    qc.invalidateQueries({ queryKey: ['status', project] });
    qc.invalidateQueries({ queryKey: ['resume', project] });
  }

  return (
    <div
      className={
        panel
          ? 'card mb-6 p-3'
          : 'mb-6'
      }
    >
      <label className="mb-1.5 block text-sm font-semibold text-neutral-500">
        {type === 'feature' ? 'Stories' : 'Tasks & bugs'}
        {type === 'story' && children.length > 0 && (
          <span className="ml-1 font-normal text-neutral-400">
            ({done}/{children.length})
          </span>
        )}
      </label>
      {children.length === 0 ? (
        <p className="text-sm text-neutral-400">None yet.</p>
      ) : (
        <ul className="space-y-1">
          {children.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-lg p-1 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
            >
              <ItemTypeBadge
                type={c.type}
                id={c.id}
                checked={type === 'story' ? isDone(c.status) : undefined}
                onToggle={type === 'story' ? () => toggleDone(c as Task | Bug) : undefined}
              />
              <Link
                to={`/item/${c.id}`}
                title={c.title}
                className={`flex-1 truncate hover:underline ${isDone(c.status) ? 'text-neutral-400 line-through' : ''}`}
              >
                {c.title}
              </Link>
              <StatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
