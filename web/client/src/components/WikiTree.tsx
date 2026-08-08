import { useState } from 'react';
import type { WikiTreeNode } from '../api';

export function WikiTree({
  nodes,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  nodes: WikiTreeNode[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  return (
    <ul
      className={depth === 0 ? 'space-y-0.5' : 'ml-3 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800'}
    >
      {nodes.map((n) =>
        n.type === 'folder' ? (
          <FolderNode key={n.path} node={n} selectedPath={selectedPath} onSelect={onSelect} depth={depth} />
        ) : (
          <li key={n.path}>
            <button
              onClick={() => onSelect(n.path)}
              title={n.title}
              className={`block w-full truncate rounded px-1.5 py-1 text-left text-sm transition-colors ${
                selectedPath === n.path
                  ? 'bg-blue-500/15 font-medium text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {n.title}
            </button>
          </li>
        )
      )}
    </ul>
  );
}

function FolderNode({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: WikiTreeNode;
  selectedPath?: string;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const containsSelected = !!selectedPath && (selectedPath === node.path || selectedPath.startsWith(`${node.path}/`));
  const [open, setOpen] = useState(containsSelected);
  const expanded = open || containsSelected;

  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <span className={`inline-block text-[10px] transition-transform ${expanded ? '' : '-rotate-90'}`}>▾</span>
        {node.name}
      </button>
      {expanded && node.children && (
        <WikiTree nodes={node.children} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
      )}
    </li>
  );
}
