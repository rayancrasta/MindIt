import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildErDiagram, listSchemaTablesRecursive } from '../store/schemas.js';
import { safeHandler } from './common.js';

export function registerGetSchemaErdTool(server: McpServer): void {
  server.registerTool(
    'get_schema_erd',
    {
      title: 'Get Schema ER Diagram',
      description:
        'Generate a Mermaid erDiagram showing every table and its foreign-key relationships for a project ' +
        '(or one folder within it). Useful to view or paste the relations elsewhere — the same diagram the web UI renders.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        folder: z.string().optional().describe('Folder to scope the diagram to; omit for the whole project'),
      },
    },
    safeHandler(({ project, folder }) => {
      const tables = listSchemaTablesRecursive(project, folder);
      if (tables.length === 0) return 'No schema tables found.';
      return buildErDiagram(tables);
    })
  );
}
