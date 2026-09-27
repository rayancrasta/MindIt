import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createSchemaTable } from '../store/schemas.js';
import { safeHandler } from './common.js';
import { schemaLink } from './schemaLink.js';
import { columnSchema } from './schemaColumn.js';

export function registerCreateSchemaTableTool(server: McpServer): void {
  server.registerTool(
    'create_schema_table',
    {
      title: 'Create Schema Table',
      description:
        'Create a new database table definition at a folder/file path within a project, Obsidian-style ' +
        '(e.g. "billing_db/invoices") — folders can be used to group tables by database. Parent folders are ' +
        'created automatically. Fails if a table already exists at that path — use update_schema_table to change one. ' +
        'A foreign key column may reference any other table in the same project by path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z
          .string()
          .min(1)
          .describe('Folder/file path for the table, e.g. "billing_db/invoices" (".md" optional)'),
        columns: z.array(columnSchema).optional().describe('Initial columns for the table'),
        description: z.string().optional().describe('Free-text notes about this table'),
        title: z.string().optional().describe('Table title — defaults to the last path segment'),
      },
    },
    safeHandler(({ project, path, columns, description, title }) => {
      const table = createSchemaTable(project, path, columns ?? [], description ?? '', title);
      return `Created schema table "${table.title}" at ${table.path}.md — link to it from a wiki page or comment with ${schemaLink(project, table.path)}`;
    })
  );
}
