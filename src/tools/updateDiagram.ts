import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateDiagram } from '../store/diagrams.js';
import { safeHandler } from './common.js';
import { diagramLink } from './diagramLink.js';

export function registerUpdateDiagramTool(server: McpServer): void {
  server.registerTool(
    'update_diagram',
    {
      title: 'Update Diagram',
      description:
        'Overwrite the full Mermaid source of an existing diagram. Fails if the diagram doesn\'t exist — use create_diagram for that.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the diagram to update, e.g. "Infra/Deploy Flow"'),
        content: z.string().describe('New full Mermaid source, replacing the existing one'),
      },
    },
    safeHandler(({ project, path, content }) => {
      const diagram = updateDiagram(project, path, content);
      return `Updated diagram "${diagram.title}" at ${diagram.path}.mmd — ${diagramLink(project, diagram.path)}`;
    })
  );
}
