import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateSchemaTable } from '../store/schemas.js';
import { safeHandler } from './common.js';
import { schemaLink } from './schemaLink.js';
import { columnSchema } from './schemaColumn.js';

export function registerUpdateSchemaTableTool(server: McpServer): void {
  server.registerTool(
    'update_schema_table',
    {
      title: 'Update Schema Table',
      description:
        'Overwrite the full column list and description of an existing schema table. Fails if the table doesn\'t ' +
        'exist — use create_schema_table for that.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the table to update, e.g. "billing_db/invoices"'),
        columns: z.array(columnSchema).describe('New full column list, replacing the existing one'),
        description: z.string().optional().describe('New free-text notes about this table (defaults to empty)'),
      },
    },
    safeHandler(({ project, path, columns, description }) => {
      const table = updateSchemaTable(project, path, columns, description ?? '');
      return `Updated schema table "${table.title}" at ${table.path}.md — ${schemaLink(project, table.path)}`;
    })
  );
}
