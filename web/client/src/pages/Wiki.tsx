import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type WikiPage } from '../api';
import { useProject } from '../context/ProjectContext';
import { MarkdownBody } from '../components/Markdown';
import { Tree, type PendingCreate, type TreeNode } from '../components/Tree';
import { ContextMenu, type ContextMenuItem, type ContextMenuState } from '../components/ContextMenu';
import { ConfirmDialog, type ConfirmDialogState } from '../components/ConfirmDialog';
import { CollapseAllIcon, FilePlusIcon, FolderPlusIcon, LinkIcon, PencilIcon, TrashIcon } from '../components/icons';

const WIDTH_KEY = 'work-tracker:wiki-sidebar-width';
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

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

function parentOf(path: string): string {
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
}

/** The big page title, styled and behaving like Obsidian's title bar: editing it renames the file. */
function TitleField({
  value,
  onCommit,
  inputRef,
}: {
  value: string;
  onCommit: (next: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== value) onCommit(trimmed);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className="w-full min-w-0 truncate rounded border border-transparent bg-transparent text-xl font-semibold tracking-tight text-neutral-900 outline-none transition-colors hover:border-neutral-200 focus:border-violet-400 dark:text-neutral-100 dark:hover:border-neutral-700"
    />
  );
}

/** The page body: rendered markdown until clicked, then a plain textarea that autosaves — Obsidian's "click your note and just type" feel. */
function PageBody({ project, path, page }: { project: string; path: string; page: WikiPage }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(null);
    setStatus('idle');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
  }, [project, path]);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  async function flush(content: string) {
    await api.wiki.page.update(project, path, content);
    qc.setQueryData(['wiki-page', project, path], (old: WikiPage | undefined) => (old ? { ...old, content } : old));
    qc.invalidateQueries({ queryKey: ['wiki-tree', project] });
    setStatus('saved');
  }

  function onChange(value: string) {
    setDraft(value);
    setStatus('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => flush(value), 700);
  }

  function startEditing() {
    setDraft(page.content);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
      autoResize(el);
    });
  }

  function stopEditing() {
    if (draft !== null) {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      flush(draft);
    }
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <div>
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => {
            onChange(e.target.value);
            autoResize(e.target);
          }}
          onBlur={stopEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          placeholder="Start writing…"
          className="w-full resize-none overflow-hidden rounded-lg bg-transparent px-1 py-1 text-sm leading-relaxed text-neutral-700 outline-none dark:text-neutral-200"
        />
        <p className="mt-1 px-1 text-[11px] text-neutral-400">{status === 'saving' ? 'Saving…' : 'Saved'}</p>
      </div>
    );
  }

  return (
    <div
      onClick={startEditing}
      className="min-h-[3rem] cursor-text rounded-lg px-1 py-1 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
    >
      {page.content.trim() ? (
        <MarkdownBody text={page.content} />
      ) : (
        <p className="text-sm text-neutral-400">Click to start writing…</p>
      )}
    </div>
  );
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

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : 260;
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate>(null);
  const [draggingNode, setDraggingNode] = useState<TreeNode | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const [collapseTick, setCollapseTick] = useState(0);
  const [opError, setOpError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContextMenu(null);
    setConfirmDialog(null);
    setRenamingPath(null);
    setPendingCreate(null);
    setOpError(null);
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

  function startResize(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    function onMove(ev: MouseEvent) {
      setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (ev.clientX - startX))));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setSidebarWidth((w) => {
        localStorage.setItem(WIDTH_KEY, String(w));
        return w;
      });
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function submitCreate(name: string) {
    if (!pendingCreate || !project) return;
    const { parent, type } = pendingCreate;
    const fullPath = parent ? `${parent}/${name}` : name;
    setPendingCreate(null);
    try {
      if (type === 'folder') {
        await api.wiki.folder.create(project, fullPath);
        invalidateTree();
      } else {
        const page = await api.wiki.page.create(project, { path: fullPath });
        invalidateTree();
        select(page.path);
      }
    } catch (err) {
      setOpError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submitRename(node: TreeNode, newName: string) {
    if (!project) return;
    setRenamingPath(null);
    const parent = parentOf(node.path);
    const newPath = parent ? `${parent}/${newName}` : newName;
    try {
      if (node.type === 'folder') {
        await api.wiki.folder.move(project, node.path, newPath);
        if (path === node.path || path.startsWith(`${node.path}/`)) select(newPath + path.slice(node.path.length));
      } else {
        const moved = await api.wiki.page.move(project, node.path, newPath);
        if (path === node.path) select(moved.path);
      }
      invalidateTree();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : String(err));
    }
  }

  function deleteNode(node: TreeNode) {
    setConfirmDialog({
      message:
        node.type === 'folder'
          ? `Delete folder "${node.name}" and everything inside it? This can't be undone.`
          : `Delete page "${node.title ?? node.name}"? This can't be undone.`,
      onConfirm: () => performDelete(node),
    });
  }

  async function performDelete(node: TreeNode) {
    if (!project) return;
    try {
      if (node.type === 'folder') {
        await api.wiki.folder.remove(project, node.path);
      } else {
        await api.wiki.page.remove(project, node.path);
      }
      invalidateTree();
      if (path === node.path || (node.type === 'folder' && path.startsWith(`${node.path}/`))) select('');
    } catch (err) {
      setOpError(err instanceof Error ? err.message : String(err));
    }
  }

  async function moveNode(node: TreeNode, targetFolder: string) {
    if (!project) return;
    if (parentOf(node.path) === targetFolder) return;
    if (node.type === 'folder' && (targetFolder === node.path || targetFolder.startsWith(`${node.path}/`))) return;
    const newPath = targetFolder ? `${targetFolder}/${node.name}` : node.name;
    try {
      if (node.type === 'folder') {
        await api.wiki.folder.move(project, node.path, newPath);
        if (path === node.path || path.startsWith(`${node.path}/`)) select(newPath + path.slice(node.path.length));
      } else {
        const moved = await api.wiki.page.move(project, node.path, newPath);
        if (path === node.path) select(moved.path);
      }
      invalidateTree();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : String(err));
    }
  }

  function nodeContextItems(node: TreeNode): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    if (node.type === 'folder') {
      items.push({ label: 'New note', icon: <FilePlusIcon />, onClick: () => setPendingCreate({ parent: node.path, type: 'page' }) });
      items.push({ label: 'New folder', icon: <FolderPlusIcon />, onClick: () => setPendingCreate({ parent: node.path, type: 'folder' }) });
    } else {
      items.push({ label: 'Copy link', icon: <LinkIcon />, onClick: () => copyLinkFor(node.path) });
    }
    items.push({ label: 'Rename', icon: <PencilIcon />, onClick: () => setRenamingPath(node.path) });
    items.push({ label: 'Delete', icon: <TrashIcon />, danger: true, onClick: () => deleteNode(node) });
    return items;
  }

  function openContextMenu(e: ReactMouseEvent, node: TreeNode) {
    setContextMenu({ x: e.clientX, y: e.clientY, items: nodeContextItems(node) });
  }

  function openRootContextMenu(e: ReactMouseEvent) {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'New note', icon: <FilePlusIcon />, onClick: () => setPendingCreate({ parent: '', type: 'page' }) },
        { label: 'New folder', icon: <FolderPlusIcon />, onClick: () => setPendingCreate({ parent: '', type: 'folder' }) },
      ],
    });
  }

  async function copyLinkFor(p: string) {
    if (!project) return;
    const url = `${window.location.origin}/wiki/${encodeURIComponent(project)}/${encodePath(p)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function openPageMenu(e: ReactMouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      x: rect.right - 170,
      y: rect.bottom + 4,
      items: [
        { label: copied ? 'Copied!' : 'Copy link', icon: <LinkIcon />, onClick: () => copyLinkFor(path) },
        { label: 'Rename', icon: <PencilIcon />, onClick: () => titleInputRef.current?.focus() },
        {
          label: 'Delete',
          icon: <TrashIcon />,
          danger: true,
          onClick: () => deleteNode({ name: path.split('/').pop() ?? path, path, type: 'page', title: page?.title }),
        },
      ],
    });
  }

  if (!project) {
    return <p className="text-neutral-500">Create a project first from the sidebar.</p>;
  }

  const tree = treeQ.data ?? [];
  const page = pageQ.data;
  const breadcrumb = path ? path.split('/').slice(0, -1) : [];

  return (
    <div className="flex items-stretch gap-0">
      <div className="card flex shrink-0 flex-col p-0" style={{ width: sidebarWidth }}>
        <div
          onDragOver={(e) => {
            if (draggingNode) {
              e.preventDefault();
              setDropTargetPath('');
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggingNode) moveNode(draggingNode, '');
            setDropTargetPath(null);
          }}
          className={`flex items-center justify-between gap-2 border-b border-neutral-200/80 px-3 py-2.5 dark:border-neutral-700 ${
            dropTargetPath === '' && draggingNode ? 'bg-violet-500/10' : ''
          }`}
        >
          <button onClick={() => select('')} className="text-sm font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            Wiki
          </button>
          <div className="flex items-center gap-0.5 text-neutral-400">
            <button
              onClick={() => setPendingCreate({ parent: '', type: 'page' })}
              title="New note"
              className="rounded p-1 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              <FilePlusIcon className="size-4" />
            </button>
            <button
              onClick={() => setPendingCreate({ parent: '', type: 'folder' })}
              title="New folder"
              className="rounded p-1 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              <FolderPlusIcon className="size-4" />
            </button>
            <button
              onClick={() => setCollapseTick((t) => t + 1)}
              title="Collapse all"
              className="rounded p-1 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              <CollapseAllIcon className="size-4" />
            </button>
          </div>
        </div>

        <div onContextMenu={openRootContextMenu} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {treeQ.isLoading ? (
            <p className="p-1.5 text-sm text-neutral-400">Loading…</p>
          ) : (
            <Tree
              nodes={tree}
              selectedPath={path}
              onSelect={select}
              interactions={{
                onContextMenu: (e, node) => {
                  e.stopPropagation();
                  openContextMenu(e, node);
                },
                renamingPath,
                onRenameSubmit: submitRename,
                onRenameCancel: () => setRenamingPath(null),
                pendingCreate,
                onCreateSubmit: submitCreate,
                onCreateCancel: () => setPendingCreate(null),
                draggingPath: draggingNode?.path ?? null,
                dropTargetPath,
                onDragStartNode: setDraggingNode,
                onDragEndNode: () => {
                  setDraggingNode(null);
                  setDropTargetPath(null);
                },
                onDragOverTarget: setDropTargetPath,
                onDropOnTarget: (folder) => {
                  if (draggingNode) moveNode(draggingNode, folder);
                  setDropTargetPath(null);
                },
                collapseTick,
              }}
            />
          )}
          {!treeQ.isLoading && tree.length === 0 && !pendingCreate && (
            <p className="p-1.5 text-xs text-neutral-400">
              Right-click, or use the icons above, to create your first note.
            </p>
          )}
        </div>
        {opError && (
          <p className="border-t border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
            {opError}
          </p>
        )}
      </div>

      <div onMouseDown={startResize} className="w-1.5 shrink-0 cursor-col-resize hover:bg-violet-400/40" />

      <div className="card min-h-[16rem] min-w-0 flex-1 p-4">
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
            {breadcrumb.length > 0 && (
              <p className="mb-1 truncate text-xs text-neutral-400">{breadcrumb.join(' / ')}</p>
            )}
            <div className="mb-3 flex items-start justify-between gap-2">
              <TitleField
                value={page.title}
                inputRef={titleInputRef}
                onCommit={(next) => submitRename({ name: path.split('/').pop() ?? path, path, type: 'page', title: page.title }, next)}
              />
              <button
                onClick={openPageMenu}
                title="More"
                className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path d="M10 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                </svg>
              </button>
            </div>

            <PageBody project={project} path={path} page={page} />
          </>
        )}
      </div>

      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
