import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useProject } from '../context/ProjectContext';
import { MarkdownBody, MarkdownField } from '../components/Markdown';
import { WikiTree } from '../components/WikiTree';

function decodeSplat(splat: string | undefined): string {
  if (!splat) return '';
  return splat
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s))
    .join('/');
}

function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
}

export function Wiki() {
  const params = useParams<{ project?: string; '*': string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { project: ctxProject, setProject } = useProject();

  const routeProject = params.project;
  const path = decodeSplat(params['*']);

  useEffect(() => {
    if (routeProject) {
      if (routeProject !== ctxProject) setProject(routeProject);
    } else if (ctxProject) {
      navigate(`/wiki/${encodeURIComponent(ctxProject)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProject, ctxProject]);

  const project = routeProject ?? ctxProject;

  const treeQ = useQuery({
    queryKey: ['wiki-tree', project],
    queryFn: () => api.wiki.fullTree(project as string),
    enabled: !!project,
  });

  const pageQ = useQuery({
    queryKey: ['wiki-page', project, path],
    queryFn: () => api.wiki.page.get(project as string, path),
    enabled: !!project && !!path,
  });

  const [draft, setDraft] = useState<string | null>(null);
  const [newPath, setNewPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(null);
    setConfirmDelete(false);
    setCopied(false);
  }, [project, path]);

  function invalidateTree() {
    qc.invalidateQueries({ queryKey: ['wiki-tree', project] });
  }

  function select(p: string) {
    if (!project) return;
    const encoded = encodePath(p);
    navigate(`/wiki/${encodeURIComponent(project)}${encoded ? `/${encoded}` : ''}`);
  }

  async function createPage(e: FormEvent) {
    e.preventDefault();
    const trimmed = newPath.trim();
    if (!trimmed || !project) return;
    setCreating(true);
    setCreateError(null);
    try {
      const page = await api.wiki.page.create(project, { path: trimmed });
      setNewPath('');
      invalidateTree();
      select(page.path);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function saveDraft() {
    if (draft === null || !project) return;
    await api.wiki.page.update(project, path, draft);
    setDraft(null);
    qc.invalidateQueries({ queryKey: ['wiki-page', project, path] });
    invalidateTree();
  }

  async function doDelete() {
    if (!project) return;
    await api.wiki.page.remove(project, path);
    invalidateTree();
    setConfirmDelete(false);
    navigate(`/wiki/${encodeURIComponent(project)}`);
  }

  async function copyLink() {
    if (!project) return;
    const url = `${window.location.origin}/wiki/${encodeURIComponent(project)}/${encodePath(path)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  if (!project) {
    return <p className="text-neutral-500">Create a project first from the header.</p>;
  }

  const tree = treeQ.data ?? [];
  const page = pageQ.data;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">Wiki</h2>
          <button onClick={() => select('')} className="btn-link" title="Wiki root">
            Root
          </button>
        </div>
        {treeQ.isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : tree.length === 0 ? (
          <p className="mb-2 text-sm text-neutral-400">No pages yet.</p>
        ) : (
          <WikiTree nodes={tree} selectedPath={path} onSelect={select} />
        )}
        <form onSubmit={createPage} className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
          <label className="mb-1 block text-xs font-medium text-neutral-500">New page</label>
          <input
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="Folder/Page name"
            className="input mb-1.5 text-sm"
          />
          {createError && <p className="mb-1.5 text-xs text-red-600">{createError}</p>}
          <button type="submit" disabled={!newPath.trim() || creating} className="btn-secondary w-full text-xs">
            Create
          </button>
        </form>
      </div>

      <div className="card min-h-[16rem] p-4">
        {!path ? (
          <p className="text-sm text-neutral-400">Select a page from the tree, or create one to get started.</p>
        ) : pageQ.isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : pageQ.error || !page ? (
          <p className="text-sm text-red-600">
            {pageQ.error instanceof Error ? pageQ.error.message : `Page "${path}" not found.`}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">{page.title}</h1>
                <p className="truncate text-xs text-neutral-400">
                  {path}.md · Updated {new Date(page.updated).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={copyLink} className="btn-secondary px-2.5 py-1 text-xs">
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                {draft === null && (
                  <button onClick={() => setDraft(page.content)} className="btn-secondary px-2.5 py-1 text-xs">
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

            {draft !== null ? (
              <div>
                <MarkdownField value={draft} onChange={setDraft} rows={16} autoFocus />
                <div className="mt-2 flex gap-2">
                  <button onClick={saveDraft} className="btn-primary px-2.5 py-1 text-xs">
                    Save
                  </button>
                  <button onClick={() => setDraft(null)} className="btn-ghost px-2.5 py-1 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            ) : page.content.trim() ? (
              <MarkdownBody text={page.content} />
            ) : (
              <p className="text-sm text-neutral-400">This page is empty. Click Edit to add content.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
