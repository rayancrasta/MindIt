import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SchemaColumn } from '../api';
import { useProject } from '../context/ProjectContext';
import { Tree } from '../components/Tree';
import { SchemaColumnsTable } from '../components/SchemaColumnsTable';
import { SchemaRelationsView } from '../components/SchemaRelationsView';
import { SchemaTableDetailPanel } from '../components/SchemaTableDetailPanel';

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

interface ColumnDraft {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  fkTable: string;
  fkColumn: string;
}

function toColumnDraft(c: SchemaColumn): ColumnDraft {
  return {
    name: c.name,
    type: c.type,
    nullable: !!c.nullable,
    primaryKey: !!c.primaryKey,
    fkTable: c.foreignKey?.table ?? '',
    fkColumn: c.foreignKey?.column ?? '',
  };
}

function fromColumnDraft(c: ColumnDraft): SchemaColumn | null {
  if (!c.name.trim() || !c.type.trim()) return null;
  const column: SchemaColumn = { name: c.name.trim(), type: c.type.trim() };
  if (c.nullable) column.nullable = true;
  if (c.primaryKey) column.primaryKey = true;
  if (c.fkTable.trim() && c.fkColumn.trim()) {
    column.foreignKey = { table: c.fkTable.trim(), column: c.fkColumn.trim() };
  }
  return column;
}

const emptyColumn = (): ColumnDraft => ({
  name: '',
  type: '',
  nullable: false,
  primaryKey: false,
  fkTable: '',
  fkColumn: '',
});

function tabClass(active: boolean): string {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
  }`;
}

export function Schemas() {
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
      navigate(`/schemas/${encodeURIComponent(ctxProject)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProject, ctxProject]);

  const project = routeProject ?? ctxProject;

  const [view, setView] = useState<'relations' | 'tree'>(() => (path ? 'tree' : 'relations'));
  const [relationsSelectedPath, setRelationsSelectedPath] = useState<string | null>(null);

  const PANEL_MIN = 300;
  const PANEL_MAX = 640;
  const [panelWidth, setPanelWidth] = useState(400);
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeState.current) return;
      const delta = resizeState.current.startX - e.clientX;
      setPanelWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, resizeState.current.startWidth + delta)));
    }
    function onMouseUp() {
      if (!resizeState.current) return;
      resizeState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function startPanelResize(e: ReactMouseEvent) {
    resizeState.current = { startX: e.clientX, startWidth: panelWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  const treeQ = useQuery({
    queryKey: ['schema-tree', project],
    queryFn: () => api.schemas.fullTree(project as string),
    enabled: !!project,
  });
  const tree = treeQ.data ?? [];

  const tablesQ = useQuery({
    queryKey: ['schema-tables', project],
    queryFn: () => api.schemas.tables(project as string),
    enabled: !!project,
  });
  const tables = tablesQ.data ?? [];

  const tableQ = useQuery({
    queryKey: ['schema-table', project, path],
    queryFn: () => api.schemas.table.get(project as string, path),
    enabled: !!project && !!path,
  });

  const [draft, setDraft] = useState<{ columns: ColumnDraft[]; description: string } | null>(null);
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

  useEffect(() => {
    setRelationsSelectedPath(null);
  }, [project]);

  function invalidateLists() {
    qc.invalidateQueries({ queryKey: ['schema-tree', project] });
    qc.invalidateQueries({ queryKey: ['schema-tables', project] });
  }

  function select(p: string) {
    if (!project) return;
    const encoded = encodePath(p);
    navigate(`/schemas/${encodeURIComponent(project)}${encoded ? `/${encoded}` : ''}`);
  }

  async function createTable(e: FormEvent) {
    e.preventDefault();
    const trimmed = newPath.trim();
    if (!trimmed || !project) return;
    setCreating(true);
    setCreateError(null);
    try {
      const table = await api.schemas.table.create(project, { path: trimmed });
      setNewPath('');
      invalidateLists();
      setView('tree');
      select(table.path);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function saveDraft() {
    if (draft === null || !project) return;
    const columns = draft.columns.map(fromColumnDraft).filter((c): c is SchemaColumn => c !== null);
    await api.schemas.table.update(project, path, columns, draft.description);
    setDraft(null);
    qc.invalidateQueries({ queryKey: ['schema-table', project, path] });
    invalidateLists();
  }

  async function doDelete() {
    if (!project) return;
    await api.schemas.table.remove(project, path);
    invalidateLists();
    setConfirmDelete(false);
    navigate(`/schemas/${encodeURIComponent(project)}`);
  }

  async function copyLink() {
    if (!project) return;
    const url = `${window.location.origin}/schemas/${encodeURIComponent(project)}/${encodePath(path)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  function updateColumn(index: number, patch: Partial<ColumnDraft>) {
    setDraft((d) => {
      if (!d) return d;
      const columns = d.columns.slice();
      columns[index] = { ...columns[index], ...patch };
      return { ...d, columns };
    });
  }

  function removeColumn(index: number) {
    setDraft((d) => (d ? { ...d, columns: d.columns.filter((_, i) => i !== index) } : d));
  }

  function addColumn() {
    setDraft((d) => (d ? { ...d, columns: [...d.columns, emptyColumn()] } : d));
  }

  function editFromRelations(p: string) {
    setView('tree');
    setRelationsSelectedPath(null);
    select(p);
  }

  if (!project) {
    return <p className="text-neutral-500">Create a project first from the header.</p>;
  }

  const table = tableQ.data;
  const relationsSelectedTable = relationsSelectedPath ? tables.find((t) => t.path === relationsSelectedPath) : null;

  return (
    <div>
      <div className="mb-4 flex w-fit gap-0.5 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
        <button onClick={() => setView('relations')} className={tabClass(view === 'relations')}>
          Relations
        </button>
        <button onClick={() => setView('tree')} className={tabClass(view === 'tree')}>
          Tree
        </button>
      </div>

      {view === 'relations' ? (
        <div className="flex min-h-[28rem] flex-col gap-4 xl:h-[calc(100vh-13rem)] xl:flex-row">
          <div className="min-w-0 flex-1">
            <SchemaRelationsView
              tables={tables}
              onSelectTable={setRelationsSelectedPath}
              selectedPath={relationsSelectedPath}
            />
          </div>
          {relationsSelectedTable && (
            <>
              <div
                onMouseDown={startPanelResize}
                className="hidden w-2 shrink-0 cursor-col-resize items-center justify-center xl:flex"
                title="Drag to resize"
              >
                <div className="h-16 w-1 rounded-full bg-neutral-300 transition-colors hover:bg-blue-400 dark:bg-neutral-600" />
              </div>
              <div
                className="max-w-full shrink-0 xl:w-[var(--panel-w)]"
                style={{ '--panel-w': `${panelWidth}px` } as CSSProperties}
              >
                <SchemaTableDetailPanel
                  table={relationsSelectedTable}
                  onClose={() => setRelationsSelectedPath(null)}
                  onEdit={() => editFromRelations(relationsSelectedTable.path)}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-500">Schemas</h2>
              <button onClick={() => select('')} className="btn-link" title="Schemas root">
                Root
              </button>
            </div>
            {treeQ.isLoading ? (
              <p className="text-sm text-neutral-400">Loading…</p>
            ) : tree.length === 0 ? (
              <p className="mb-2 text-sm text-neutral-400">No tables yet.</p>
            ) : (
              <Tree nodes={tree} selectedPath={path} onSelect={select} />
            )}
            <form onSubmit={createTable} className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              <label className="mb-1 block text-xs font-medium text-neutral-500">New table</label>
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="database/table_name"
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
              <p className="text-sm text-neutral-400">
                Select a table from the tree, or create one to get started. Use folders (e.g. "billing_db/invoices")
                to group tables by database — or switch to the Relations tab to see the full picture.
              </p>
            ) : tableQ.isLoading ? (
              <p className="text-sm text-neutral-400">Loading…</p>
            ) : tableQ.error || !table ? (
              <p className="text-sm text-red-600">
                {tableQ.error instanceof Error ? tableQ.error.message : `Table "${path}" not found.`}
              </p>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold tracking-tight">{table.title}</h1>
                    <p className="truncate text-xs text-neutral-400">
                      {path}.md · {table.columns.length} column{table.columns.length === 1 ? '' : 's'} · Updated{' '}
                      {new Date(table.updated).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={copyLink} className="btn-secondary px-2.5 py-1 text-xs">
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                    {draft === null && (
                      <button
                        onClick={() =>
                          setDraft({ columns: table.columns.map(toColumnDraft), description: table.description })
                        }
                        className="btn-secondary px-2.5 py-1 text-xs"
                      >
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
                    <div className="space-y-2">
                      {draft.columns.length === 0 && (
                        <p className="text-sm text-neutral-400">No columns yet. Add one below.</p>
                      )}
                      {draft.columns.map((c, i) => (
                        <div key={i} className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-700">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              value={c.name}
                              onChange={(e) => updateColumn(i, { name: e.target.value })}
                              placeholder="column_name"
                              className="input w-36 text-sm"
                            />
                            <input
                              value={c.type}
                              onChange={(e) => updateColumn(i, { type: e.target.value })}
                              placeholder="TYPE"
                              className="input w-28 text-sm"
                            />
                            <label className="flex items-center gap-1 text-xs text-neutral-500">
                              <input
                                type="checkbox"
                                checked={c.nullable}
                                onChange={(e) => updateColumn(i, { nullable: e.target.checked })}
                              />
                              Nullable
                            </label>
                            <label className="flex items-center gap-1 text-xs text-neutral-500">
                              <input
                                type="checkbox"
                                checked={c.primaryKey}
                                onChange={(e) => updateColumn(i, { primaryKey: e.target.checked })}
                              />
                              PK
                            </label>
                            <button
                              type="button"
                              onClick={() => removeColumn(i)}
                              className="btn-ghost ml-auto px-2 py-0.5 text-xs text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-neutral-400">Foreign key →</span>
                            <input
                              value={c.fkTable}
                              onChange={(e) => updateColumn(i, { fkTable: e.target.value })}
                              placeholder="database/table"
                              className="input w-40 text-xs"
                            />
                            <input
                              value={c.fkColumn}
                              onChange={(e) => updateColumn(i, { fkColumn: e.target.value })}
                              placeholder="column"
                              className="input w-28 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addColumn} className="btn-secondary w-full text-xs">
                        Add column
                      </button>
                    </div>
                    <label className="mt-3 mb-1 block text-xs font-medium text-neutral-500">Description</label>
                    <textarea
                      value={draft.description}
                      onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                      rows={4}
                      className="input w-full text-sm"
                      placeholder="Notes about this table…"
                    />
                    <div className="mt-2 flex gap-2">
                      <button onClick={saveDraft} className="btn-primary px-2.5 py-1 text-xs">
                        Save
                      </button>
                      <button onClick={() => setDraft(null)} className="btn-ghost px-2.5 py-1 text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <SchemaColumnsTable columns={table.columns} />
                    {table.description.trim() && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
                        {table.description}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
