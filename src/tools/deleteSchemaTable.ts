import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteSchemaTable } from '../store/schemas.js';
import { safeHandler } from './common.js';

export function registerDeleteSchemaTableTool(server: McpServer): void {
  server.registerTool(
    'delete_schema_table',
    {
      title: 'Delete Schema Table',
      description: 'Delete a schema table by its path. Fails if no table exists at that path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the table to delete, e.g. "billing_db/invoices"'),
      },
    },
    safeHandler(({ project, path }) => {
      const table = deleteSchemaTable(project, path);
      return `Deleted schema table "${table.title}" at ${table.path}.md.`;
    })
  );
}
