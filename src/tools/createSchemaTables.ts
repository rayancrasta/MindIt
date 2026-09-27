import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createSchemaTables } from '../store/schemas.js';
import { safeHandler } from './common.js';
import { schemaLink } from './schemaLink.js';
import { columnSchema } from './schemaColumn.js';

export function registerCreateSchemaTablesTool(server: McpServer): void {
  server.registerTool(
    'create_schema_tables',
    {
      title: 'Create Schema Tables (Bulk)',
      description:
        'Create several schema tables in one call — e.g. scaffolding every table in a project at once, instead of ' +
        'one create_schema_table call per table. Each entry takes the same fields as create_schema_table. A table ' +
        'that already exists is reported as a failure without stopping the rest of the batch.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        tables: z
          .array(
            z.object({
              path: z.string().min(1).describe('Folder/file path for the table, e.g. "billing_db/invoices"'),
              columns: z.array(columnSchema).optional().describe('Initial columns for the table'),
              description: z.string().optional().describe('Free-text notes about this table'),
              title: z.string().optional().describe('Table title — defaults to the last path segment'),
            })
          )
          .min(1)
          .describe('Tables to create'),
      },
    },
    safeHandler(({ project, tables }) => {
      const { created, errors } = createSchemaTables(project, tables);
      const lines = [
        ...created.map((t) => `Created "${t.title}" at ${t.path}.md — ${schemaLink(project, t.path)}`),
        ...errors.map((e) => `Failed "${e.path}": ${e.message}`),
      ];
      return `${created.length} created, ${errors.length} failed.\n${lines.join('\n')}`;
    })
  );
}
