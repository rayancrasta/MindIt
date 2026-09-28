import { z } from 'zod';

/** Shared column shape for create_schema_table / update_schema_table. */
export const columnSchema = z.object({
  name: z.string().min(1).describe('Column name'),
  type: z.string().min(1).describe('SQL type, e.g. "VARCHAR(255)", "INT", "UUID" (free-text, any dialect)'),
  nullable: z.boolean().optional().describe('Whether the column allows NULL'),
  primaryKey: z.boolean().optional().describe('Whether this column is (part of) the primary key'),
  foreignKey: z
    .object({
      table: z.string().min(1).describe('Path of the referenced table in the same project, e.g. "billing_db/customers"'),
      column: z.string().min(1).describe('Referenced column name in that table'),
    })
    .optional()
    .describe('Foreign key target, if this column references another table in the same project'),
});

export function formatColumns(columns: { name: string; type: string; nullable?: boolean; primaryKey?: boolean; foreignKey?: { table: string; column: string } }[]): string {
  if (columns.length === 0) return '(no columns)';
  return columns
    .map((c) => {
      const flags = [
        c.primaryKey ? 'PK' : null,
        c.foreignKey ? `FK -> ${c.foreignKey.table}.${c.foreignKey.column}` : null,
        c.nullable ? 'nullable' : null,
      ].filter(Boolean);
      return `- ${c.name}: ${c.type}${flags.length ? ` [${flags.join(', ')}]` : ''}`;
    })
    .join('\n');
}
