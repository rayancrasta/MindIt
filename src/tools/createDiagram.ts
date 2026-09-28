import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DIAGRAM_KINDS } from '../types.js';
import { createDiagram } from '../store/diagrams.js';
import { safeHandler } from './common.js';
import { diagramMarkdownLink } from './diagramLink.js';

export function registerCreateDiagramTool(server: McpServer): void {
  server.registerTool(
    'create_diagram',
    {
      title: 'Create Diagram',
      description:
        'Create a new Mermaid diagram at a folder/file path within a project, Obsidian-style (e.g. "Infra/Deploy Flow"). ' +
        'Parent folders are created automatically. Fails if a diagram already exists at that path — use update_diagram ' +
        'to change one. Content is raw Mermaid source (e.g. "graph TD\\n  A --> B"), not markdown. Diagrams are split ' +
        'into two kinds in the diagrams section: "sequence" (Mermaid sequenceDiagram source) and "mermaid" (every other ' +
        'Mermaid diagram type — flowchart, class, ER, state, etc.).',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z
          .string()
          .min(1)
          .describe('Folder/file path for the diagram, e.g. "Infra/Deploy Flow" (".mmd" optional)'),
        content: z.string().optional().describe('Initial Mermaid source, e.g. "graph TD\\n  A --> B"'),
        title: z.string().optional().describe('Diagram title — defaults to the last path segment'),
        kind: z
          .enum(DIAGRAM_KINDS as [string, ...string[]])
          .optional()
          .describe('Diagram kind — "sequence" or "mermaid". Defaults to "mermaid".'),
      },
    },
    safeHandler(({ project, path, content, title, kind }) => {
      const diagram = createDiagram(project, path, content ?? '', title, kind as 'sequence' | 'mermaid' | undefined);
      return `Created ${diagram.kind} diagram "${diagram.title}" at ${diagram.path}.mmd — link to it from a wiki page or comment with ${diagramMarkdownLink(project, diagram.path, diagram.kind, diagram.title)}`;
    })
  );
}
