import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ProjectMeta } from '../api';
import { useProject } from '../context/ProjectContext';
import { FolderBrowserModal } from '../components/FolderBrowserModal';
import { useNavigate } from 'react-router-dom';

export function Projects() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { project, setProject } = useProject();
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  const [newName, setNewName] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['projects'] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const meta = await api.projects.create({ name: newName.trim(), path: customPath.trim() || undefined });
      invalidate();
      setNewName('');
      setCustomPath('');
      setProject(meta.slug);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  const projects = projectsQ.data ?? [];

  return (
    <div>
      <form onSubmit={onCreate} className="card mb-6 flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New project name"
            className="input w-auto min-w-48 flex-1"
          />
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Creating…' : '+ New project'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {customPath ? (
            <>
              <span
                title={customPath}
                className="max-w-md truncate rounded-md bg-neutral-100 px-2 py-1 font-mono text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
              >
                {customPath}
              </span>
              <button
                type="button"
                onClick={() => setCustomPath('')}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Clear
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setFolderBrowserOpen(true)}
              className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
            >
              Use a custom folder…
            </button>
          )}
          <span className="text-neutral-400 dark:text-neutral-500">
            Defaults to a folder inside this app's data/ directory.
          </span>
        </div>
        {createError && <p className="text-xs text-red-500">{createError}</p>}
      </form>

      {projectsQ.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-neutral-400">No projects yet.</p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <ProjectRow
              key={p.slug}
              meta={p}
              isCurrent={p.slug === project}
              onSwitch={() => {
                setProject(p.slug);
                navigate('/backlog');
              }}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}

      {folderBrowserOpen && (
        <FolderBrowserModal
          onClose={() => setFolderBrowserOpen(false)}
          onSelect={(p) => {
            setCustomPath(p);
            setFolderBrowserOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProjectRow({
  meta,
  isCurrent,
  onSwitch,
  onChanged,
}: {
  meta: ProjectMeta;
  isCurrent: boolean;
  onSwitch: () => void;
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(meta.name);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveRename() {
    if (!name.trim() || name.trim() === meta.name) {
      setRenaming(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.projects.rename(meta.slug, name.trim());
      setRenaming(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function doRemove() {
    try {
      await api.projects.remove(meta.slug);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConfirmRemove(false);
    }
  }

  return (
    <div className={`card flex flex-wrap items-center gap-3 p-3 ${isCurrent ? 'ring-1 ring-violet-500/40' : ''}`}>
      <div className="min-w-0 flex-1">
        {renaming ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
              className="input py-1 text-sm"
            />
            <button onClick={saveRename} disabled={saving} className="btn-primary px-2.5 py-1 text-xs">
              Save
            </button>
            <button onClick={() => setRenaming(false)} className="btn-ghost px-2.5 py-1 text-xs">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{meta.name}</span>
            {isCurrent && (
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                Current
              </span>
            )}
            {meta.path && (
              <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                External
              </span>
            )}
          </div>
        )}
        <p className="mt-0.5 truncate font-mono text-xs text-neutral-400 dark:text-neutral-500">
          {meta.path ?? `data/${meta.slug}`}
        </p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      {!renaming && (
        <div className="flex shrink-0 items-center gap-2">
          {!isCurrent && (
            <button onClick={onSwitch} className="btn-secondary px-2.5 py-1 text-xs">
              Switch
            </button>
          )}
          <button onClick={() => setRenaming(true)} className="btn-ghost px-2.5 py-1 text-xs">
            Rename
          </button>
          {!confirmRemove ? (
            <button onClick={() => setConfirmRemove(true)} className="btn-danger-outline px-2.5 py-1 text-xs">
              Remove
            </button>
          ) : (
            <>
              <button onClick={doRemove} className="btn-danger px-2.5 py-1 text-xs">
                Confirm
              </button>
              <button onClick={() => setConfirmRemove(false)} className="btn-ghost px-2.5 py-1 text-xs">
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
