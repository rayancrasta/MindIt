import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SchemaTreeNode } from '../types.js';
import { getSchemaTree, listSchemaFolder } from '../store/schemas.js';
import { safeHandler } from './common.js';

function formatTree(nodes: SchemaTreeNode[], depth = 0): string {
  const indent = '  '.repeat(depth);
  return nodes
    .map((n) =>
      n.type === 'folder'
        ? `${indent}${n.name}/\n${formatTree(n.children ?? [], depth + 1)}`
        : `${indent}${n.title} [${n.path}.md]`
    )
    .join('\n');
}

export function registerListSchemasTool(server: McpServer): void {
  server.registerTool(
    'list_schemas',
    {
      title: 'List Schemas',
      description:
        'List the folders and tables in a project\'s database schema section, like "ls". Folders can be used to ' +
        'group tables by database. Defaults to one level at the root; pass a folder to look inside it, or ' +
        'recursive: true for the full nested tree.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        folder: z.string().optional().describe('Folder path to list; omit for the schemas root'),
        recursive: z.boolean().optional().describe('If true, return the full nested tree instead of one level'),
      },
    },
    safeHandler(({ project, folder, recursive }) => {
      if (recursive) {
        const tree = getSchemaTree(project, folder);
        return tree.length === 0 ? 'Empty.' : formatTree(tree);
      }
      const { folders, pages } = listSchemaFolder(project, folder);
      if (folders.length === 0 && pages.length === 0) return 'Empty.';
      const lines = [
        ...folders.map((f) => `${f}/`),
        ...pages.map((p) => `${p.title} [${p.path}.md]`),
      ];
      return lines.join('\n');
    })
  );
}
