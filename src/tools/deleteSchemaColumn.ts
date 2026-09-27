import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteSchemaColumn } from '../store/schemas.js';
import { safeHandler } from './common.js';
import { schemaLink } from './schemaLink.js';

export function registerDeleteSchemaColumnTool(server: McpServer): void {
  server.registerTool(
    'delete_schema_column',
    {
      title: 'Delete Schema Column',
      description:
        'Remove a single column from a schema table by name, without resending the whole column list. Every ' +
        'other column and the table\'s description are left untouched. Fails if no such column exists.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the table, e.g. "billing_db/invoices"'),
        columnName: z.string().min(1).describe('Name of the column to remove'),
      },
    },
    safeHandler(({ project, path, columnName }) => {
      const table = deleteSchemaColumn(project, path, columnName);
      return `Removed column "${columnName}" from "${table.title}" — ${table.columns.length} column(s) remain. ${schemaLink(project, table.path)}`;
    })
  );
}
