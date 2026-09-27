import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { ChevronRightIcon, FileIcon, FolderIcon } from './icons';

export interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'page';
  title?: string;
  updated?: string;
  children?: TreeNode[];
}

export type PendingCreate = { parent: string; type: 'page' | 'folder' } | null;

/** Obsidian-style interactions (context menu, rename, drag-to-move, inline create). Opt-in — Diagrams/Schemas use the plain read-only tree without this. */
export interface TreeInteractions {
  onContextMenu: (e: ReactMouseEvent, node: TreeNode) => void;
  renamingPath: string | null;
  onRenameSubmit: (node: TreeNode, newName: string) => void;
  onRenameCancel: () => void;
  pendingCreate: PendingCreate;
  onCreateSubmit: (name: string) => void;
  onCreateCancel: () => void;
  draggingPath: string | null;
  dropTargetPath: string | null;
  onDragStartNode: (node: TreeNode) => void;
  onDragEndNode: () => void;
  onDragOverTarget: (path: string) => void;
  onDropOnTarget: (folderPath: string) => void;
  collapseTick: number;
}

interface TreeCtxValue {
  selectedPath?: string;
  onSelect: (path: string) => void;
  interactions?: TreeInteractions;
}

const TreeContext = createContext<TreeCtxValue | null>(null);

function useTreeCtx(): TreeCtxValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('Tree row components must be rendered within <Tree>.');
  return ctx;
}

/** A borderless auto-focusing text input used for both inline rename and inline "new item" rows. */
function InlineNameInput({
  initial,
  icon,
  onSubmit,
  onCancel,
}: {
  initial: string;
  icon: ReactNode;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initial) onSubmit(trimmed);
    else onCancel();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="flex items-center gap-1.5 rounded px-1.5 py-1">
      <span className="size-3.5 shrink-0 text-neutral-400">{icon}</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        className="w-full min-w-0 rounded border border-violet-400 bg-white px-1 py-0.5 text-sm text-neutral-900 outline-none dark:border-violet-500 dark:bg-neutral-900 dark:text-neutral-100"
      />
    </div>
  );
}

function PageRow({ node, depth }: { node: TreeNode; depth: number }) {
  const ctx = useTreeCtx();
  const it = ctx.interactions;
  const isRenaming = it?.renamingPath === node.path;
  const isDragging = it?.draggingPath === node.path;

  if (isRenaming && it) {
    return (
      <li style={{ paddingLeft: depth * 14 }}>
        <InlineNameInput
          initial={node.title ?? node.name}
          icon={<FileIcon />}
          onSubmit={(name) => it.onRenameSubmit(node, name)}
          onCancel={it.onRenameCancel}
        />
      </li>
    );
  }

  return (
    <li style={{ paddingLeft: depth * 14 }}>
      <button
        draggable={!!it}
        onDragStart={(e) => {
          if (!it) return;
          e.dataTransfer.effectAllowed = 'move';
          it.onDragStartNode(node);
        }}
        onDragEnd={it?.onDragEndNode}
        onClick={() => ctx.onSelect(node.path)}
        onContextMenu={(e) => {
          if (!it) return;
          e.preventDefault();
          it.onContextMenu(e, node);
        }}
        title={node.title}
        className={`flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left text-sm transition-colors ${
          isDragging ? 'opacity-40' : ''
        } ${
          ctx.selectedPath === node.path
            ? 'bg-violet-500/15 font-medium text-violet-700 dark:text-violet-300'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'
        }`}
      >
        <FileIcon className="size-3.5 shrink-0 opacity-60" />
        <span className="truncate">{node.title}</span>
      </button>
    </li>
  );
}

function FolderNode({ node, depth }: { node: TreeNode; depth: number }) {
  const ctx = useTreeCtx();
  const it = ctx.interactions;
  const containsSelected = !!ctx.selectedPath && (ctx.selectedPath === node.path || ctx.selectedPath.startsWith(`${node.path}/`));
  const [open, setOpen] = useState(containsSelected);
  const isRenaming = it?.renamingPath === node.path;
  const isDragging = it?.draggingPath === node.path;
  const isDropTarget = !!it && it.dropTargetPath === node.path && it.draggingPath !== node.path;
  const showCreateHere = it?.pendingCreate?.parent === node.path;

  // Auto-reveal this folder when navigation selects something inside it, without permanently
  // forcing it open — the user can still collapse it afterwards.
  useEffect(() => {
    if (containsSelected) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.selectedPath]);

  const skipNextCollapse = useRef(true);
  useEffect(() => {
    if (skipNextCollapse.current) {
      skipNextCollapse.current = false;
      return;
    }
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it?.collapseTick]);

  const expanded = open || showCreateHere;

  if (isRenaming && it) {
    return (
      <li style={{ paddingLeft: depth * 14 }}>
        <InlineNameInput
          initial={node.name}
          icon={<FolderIcon />}
          onSubmit={(name) => it.onRenameSubmit(node, name)}
          onCancel={it.onRenameCancel}
        />
      </li>
    );
  }

  return (
    <li>
      <div
        style={{ paddingLeft: depth * 14 }}
        draggable={!!it}
        onDragStart={(e) => {
          if (!it) return;
          e.dataTransfer.effectAllowed = 'move';
          it.onDragStartNode(node);
        }}
        onDragEnd={it?.onDragEndNode}
        onDragOver={(e) => {
          if (!it || !it.draggingPath || it.draggingPath === node.path) return;
          e.preventDefault();
          it.onDragOverTarget(node.path);
        }}
        onDrop={(e) => {
          if (!it) return;
          e.preventDefault();
          it.onDropOnTarget(node.path);
        }}
        onContextMenu={(e) => {
          if (!it) return;
          e.preventDefault();
          it.onContextMenu(e, node);
        }}
        className={`flex items-center gap-1 rounded px-1.5 py-1 text-sm font-medium transition-colors ${
          isDragging ? 'opacity-40' : ''
        } ${isDropTarget ? 'bg-violet-500/15 ring-1 ring-inset ring-violet-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
      >
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-1 text-left text-neutral-500 dark:text-neutral-400">
          <ChevronRightIcon className={`size-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <FolderIcon className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {expanded && <TreeList nodes={node.children ?? []} depth={depth + 1} parentPath={node.path} />}
    </li>
  );
}

function TreeList({ nodes, depth, parentPath }: { nodes: TreeNode[]; depth: number; parentPath: string }) {
  const ctx = useTreeCtx();
  const it = ctx.interactions;
  const showCreateHere = it?.pendingCreate?.parent === parentPath;
  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'space-y-0.5 border-l border-neutral-200 pl-1 dark:border-neutral-700'}>
      {showCreateHere && it?.pendingCreate && (
        <li style={{ paddingLeft: depth * 14 }}>
          <InlineNameInput
            initial=""
            icon={it.pendingCreate.type === 'folder' ? <FolderIcon /> : <FileIcon />}
            onSubmit={it.onCreateSubmit}
            onCancel={it.onCreateCancel}
          />
        </li>
      )}
      {nodes.map((n) =>
        n.type === 'folder' ? (
          <FolderNode key={n.path} node={n} depth={depth} />
        ) : (
          <PageRow key={n.path} node={n} depth={depth} />
        )
      )}
    </ul>
  );
}

export function Tree({ nodes, selectedPath, onSelect, interactions }: { nodes: TreeNode[] } & TreeCtxValue) {
  return (
    <TreeContext.Provider value={{ selectedPath, onSelect, interactions }}>
      <TreeList nodes={nodes} depth={0} parentPath="" />
    </TreeContext.Provider>
  );
}
