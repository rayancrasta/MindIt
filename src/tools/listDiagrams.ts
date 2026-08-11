import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DiagramTreeNode } from '../types.js';
import { getDiagramTree, listDiagramFolder } from '../store/diagrams.js';
import { safeHandler } from './common.js';

function formatTree(nodes: DiagramTreeNode[], depth = 0): string {
  const indent = '  '.repeat(depth);
  return nodes
    .map((n) =>
      n.type === 'folder'
        ? `${indent}${n.name}/\n${formatTree(n.children ?? [], depth + 1)}`
        : `${indent}${n.title} [${n.path}.mmd]`
    )
    .join('\n');
}

export function registerListDiagramsTool(server: McpServer): void {
  server.registerTool(
    'list_diagrams',
    {
      title: 'List Diagrams',
      description:
        'List the folders and diagrams in a project\'s diagrams section, like "ls". Defaults to one level at the root; ' +
        'pass a folder to look inside it, or recursive: true for the full nested tree.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        folder: z.string().optional().describe('Folder path to list; omit for the diagrams root'),
        recursive: z.boolean().optional().describe('If true, return the full nested tree instead of one level'),
      },
    },
    safeHandler(({ project, folder, recursive }) => {
      if (recursive) {
        const tree = getDiagramTree(project, folder);
        return tree.length === 0 ? 'Empty.' : formatTree(tree);
      }
      const { folders, pages } = listDiagramFolder(project, folder);
      if (folders.length === 0 && pages.length === 0) return 'Empty.';
      const lines = [
        ...folders.map((f) => `${f}/`),
        ...pages.map((p) => `${p.title} [${p.path}.mmd]`),
      ];
      return lines.join('\n');
    })
  );
}
