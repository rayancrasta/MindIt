import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readDiagram } from '../store/diagrams.js';
import { safeHandler } from './common.js';
import { diagramLink } from './diagramLink.js';

export function registerReadDiagramTool(server: McpServer): void {
  server.registerTool(
    'read_diagram',
    {
      title: 'Read Diagram',
      description: 'Read a diagram\'s title and full Mermaid source by its path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the diagram, e.g. "Infra/Deploy Flow"'),
      },
    },
    safeHandler(({ project, path }) => {
      const diagram = readDiagram(project, path);
      return (
        `# ${diagram.title}\n(${diagramLink(project, diagram.path)}, updated ${diagram.updated})\n\n` +
        (diagram.content || '_This diagram is empty._')
      );
    })
  );
}
