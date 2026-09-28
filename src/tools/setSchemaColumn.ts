import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setSchemaColumn } from '../store/schemas.js';
import { safeHandler } from './common.js';
import { schemaLink } from './schemaLink.js';
import { columnSchema } from './schemaColumn.js';

export function registerSetSchemaColumnTool(server: McpServer): void {
  server.registerTool(
    'set_schema_column',
    {
      title: 'Set Schema Column',
      description:
        'Add or update a single column on an existing schema table by name, without resending the whole column ' +
        'list — if a column with this name already exists it is replaced, otherwise it is appended. Every other ' +
        'column and the table\'s description are left untouched. Fails if the table doesn\'t exist.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the table, e.g. "billing_db/invoices"'),
        column: columnSchema.describe('The column to add or replace, matched by name'),
      },
    },
    safeHandler(({ project, path, column }) => {
      const table = setSchemaColumn(project, path, column);
      return `Set column "${column.name}" on "${table.title}" — ${table.columns.length} column(s) total. ${schemaLink(project, table.path)}`;
    })
  );
}
