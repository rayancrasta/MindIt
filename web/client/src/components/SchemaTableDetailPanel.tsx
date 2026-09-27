import type { SchemaTable } from '../api';
import { SchemaColumnsTable } from './SchemaColumnsTable';

export function SchemaTableDetailPanel({
  table,
  onEdit,
  onClose,
}: {
  table: SchemaTable;
  onEdit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="card flex h-full min-h-[28rem] flex-col overflow-hidden p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{table.title}</h2>
          <p className="truncate text-xs text-neutral-400">
            {table.path}.md · {table.columns.length} column{table.columns.length === 1 ? '' : 's'}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost shrink-0 px-2 py-1 text-xs" title="Close">
          Close
        </button>
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        <SchemaColumnsTable columns={table.columns} />
        {table.description.trim() && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
            {table.description}
          </p>
        )}
      </div>
      <div className="mt-auto flex gap-2 pt-3">
        <button onClick={onEdit} className="btn-secondary px-2.5 py-1 text-xs">
          Edit table
        </button>
      </div>
    </div>
  );
}
