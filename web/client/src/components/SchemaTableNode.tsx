import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TableNodeData } from './schemaLayout';

export function SchemaTableNode({ data }: NodeProps & { data: TableNodeData }) {
  const { table, highlighted, dimmed } = data;
  const segments = table.path.split('/');
  const database = segments.length > 1 ? segments.slice(0, -1).join('/') : null;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-opacity duration-150 dark:bg-neutral-800 ${
        highlighted
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-neutral-200 dark:border-neutral-700'
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40">
        {database && (
          <div className="truncate text-[10px] font-medium tracking-wide text-neutral-400 uppercase">{database}</div>
        )}
        <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{table.title}</div>
      </div>
      <div>
        {table.columns.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-400">No columns</div>
        ) : (
          table.columns.map((c) => (
            <div
              key={c.name}
              className="relative flex items-center gap-1.5 border-b border-neutral-100 px-3 py-1 text-xs last:border-b-0 dark:border-neutral-800"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`col-${c.name}`}
                className="!h-1.5 !w-1.5 !border-none !bg-neutral-400"
              />
              <span
                className={`truncate font-mono ${
                  c.primaryKey ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {c.name}
              </span>
              <span className="ml-auto shrink-0 truncate text-neutral-400">{c.type}</span>
              {c.primaryKey && (
                <span className="shrink-0 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  PK
                </span>
              )}
              {c.foreignKey && (
                <span className="shrink-0 rounded bg-blue-100 px-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  FK
                </span>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={`col-${c.name}`}
                className="!h-1.5 !w-1.5 !border-none !bg-neutral-400"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
