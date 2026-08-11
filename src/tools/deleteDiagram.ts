import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteDiagram } from '../store/diagrams.js';
import { safeHandler } from './common.js';

export function registerDeleteDiagramTool(server: McpServer): void {
  server.registerTool(
    'delete_diagram',
    {
      title: 'Delete Diagram',
      description: 'Delete a diagram by its path. Fails if no diagram exists at that path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the diagram to delete, e.g. "Infra/Deploy Flow"'),
      },
    },
    safeHandler(({ project, path }) => {
      const diagram = deleteDiagram(project, path);
      return `Deleted diagram "${diagram.title}" at ${diagram.path}.mmd.`;
    })
  );
}
