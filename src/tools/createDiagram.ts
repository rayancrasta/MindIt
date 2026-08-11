import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createDiagram } from '../store/diagrams.js';
import { safeHandler } from './common.js';
import { diagramLink } from './diagramLink.js';

export function registerCreateDiagramTool(server: McpServer): void {
  server.registerTool(
    'create_diagram',
    {
      title: 'Create Diagram',
      description:
        'Create a new Mermaid diagram at a folder/file path within a project, Obsidian-style (e.g. "Infra/Deploy Flow"). ' +
        'Parent folders are created automatically. Fails if a diagram already exists at that path — use update_diagram ' +
        'to change one. Content is raw Mermaid source (e.g. "graph TD\\n  A --> B"), not markdown.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z
          .string()
          .min(1)
          .describe('Folder/file path for the diagram, e.g. "Infra/Deploy Flow" (".mmd" optional)'),
        content: z.string().optional().describe('Initial Mermaid source, e.g. "graph TD\\n  A --> B"'),
        title: z.string().optional().describe('Diagram title — defaults to the last path segment'),
      },
    },
    safeHandler(({ project, path, content, title }) => {
      const diagram = createDiagram(project, path, content ?? '', title);
      return `Created diagram "${diagram.title}" at ${diagram.path}.mmd — link to it from a wiki page or comment with ${diagramLink(project, diagram.path)}`;
    })
  );
}
