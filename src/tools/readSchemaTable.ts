import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readSchemaTable } from '../store/schemas.js';
import { safeHandler } from './common.js';
import { schemaLink } from './schemaLink.js';
import { formatColumns } from './schemaColumn.js';

export function registerReadSchemaTableTool(server: McpServer): void {
  server.registerTool(
    'read_schema_table',
    {
      title: 'Read Schema Table',
      description: 'Read a schema table\'s title, columns, and description by its path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the table, e.g. "billing_db/invoices"'),
      },
    },
    safeHandler(({ project, path }) => {
      const table = readSchemaTable(project, path);
      return (
        `# ${table.title}\n(${schemaLink(project, table.path)}, updated ${table.updated})\n\n` +
        `${formatColumns(table.columns)}\n\n` +
        (table.description || '_No description._')
      );
    })
  );
}
