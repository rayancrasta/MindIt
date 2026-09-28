import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DIAGRAM_KINDS } from '../types.js';
import { updateDiagram } from '../store/diagrams.js';
import { safeHandler } from './common.js';
import { diagramMarkdownLink } from './diagramLink.js';

export function registerUpdateDiagramTool(server: McpServer): void {
  server.registerTool(
    'update_diagram',
    {
      title: 'Update Diagram',
      description:
        'Overwrite the full Mermaid source of an existing diagram, and optionally reclassify its kind ' +
        '("sequence" or "mermaid"). Fails if the diagram doesn\'t exist — use create_diagram for that.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the diagram to update, e.g. "Infra/Deploy Flow"'),
        content: z.string().describe('New full Mermaid source, replacing the existing one'),
        kind: z
          .enum(DIAGRAM_KINDS as [string, ...string[]])
          .optional()
          .describe('Reclassify the diagram as "sequence" or "mermaid". Omit to keep its current kind.'),
      },
    },
    safeHandler(({ project, path, content, kind }) => {
      const diagram = updateDiagram(project, path, content, kind as 'sequence' | 'mermaid' | undefined);
      return `Updated ${diagram.kind} diagram "${diagram.title}" at ${diagram.path}.mmd — ${diagramMarkdownLink(project, diagram.path, diagram.kind, diagram.title)}`;
    })
  );
}
