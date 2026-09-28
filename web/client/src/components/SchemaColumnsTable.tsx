import type { SchemaColumn } from '../api';

export function SchemaColumnsTable({ columns }: { columns: SchemaColumn[] }) {
  if (columns.length === 0) {
    return <p className="text-sm text-neutral-400">No columns yet.</p>;
  }
  return (
    <div className="custom-scrollbar overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-700">
            <th className="py-1 pr-4 font-medium whitespace-nowrap">Column</th>
            <th className="py-1 pr-4 font-medium whitespace-nowrap">Type</th>
            <th className="py-1 pr-4 font-medium whitespace-nowrap">Keys</th>
            <th className="py-1 font-medium whitespace-nowrap">References</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((c) => (
            <tr key={c.name} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-1 pr-4 font-mono whitespace-nowrap">
                {c.name}
                {c.nullable ? '' : ' *'}
              </td>
              <td className="py-1 pr-4 whitespace-nowrap text-neutral-500">{c.type}</td>
              <td className="py-1 pr-4 whitespace-nowrap">
                {[c.primaryKey ? 'PK' : null, c.foreignKey ? 'FK' : null].filter(Boolean).join(', ')}
              </td>
              <td className="py-1 whitespace-nowrap text-neutral-500">
                {c.foreignKey ? `${c.foreignKey.table}.${c.foreignKey.column}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
