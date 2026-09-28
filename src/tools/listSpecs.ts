import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform, type SpecTreeNode } from '../types.js';
import { getSpecTree, listSpecFolder } from '../store/specs.js';
import { safeHandler } from './common.js';

function formatTree(nodes: SpecTreeNode[], depth = 0): string {
  const indent = '  '.repeat(depth);
  return nodes
    .map((n) =>
      n.type === 'folder'
        ? `${indent}${n.name}/\n${formatTree(n.children ?? [], depth + 1)}`
        : `${indent}${n.title} (${n.status}) [${n.path}.md]`
    )
    .join('\n');
}

export function registerListSpecsTool(server: McpServer): void {
  server.registerTool(
    'list_specs',
    {
      title: 'List Spec Screens',
      description:
        'List the folders and screens in a project\'s web or mobile spec section, like "ls". Defaults to one ' +
        'level at the root; pass a folder to look inside it, or recursive: true for the full nested tree.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        folder: z.string().optional().describe('Folder path to list; omit for the section root'),
        recursive: z.boolean().optional().describe('If true, return the full nested tree instead of one level'),
      },
    },
    safeHandler(({ project, platform, folder, recursive }) => {
      if (recursive) {
        const tree = getSpecTree(project, platform as SpecPlatform, folder);
        return tree.length === 0 ? 'Empty.' : formatTree(tree);
      }
      const { folders, pages } = listSpecFolder(project, platform as SpecPlatform, folder);
      if (folders.length === 0 && pages.length === 0) return 'Empty.';
      const lines = [
        ...folders.map((f) => `${f}/`),
        ...pages.map((p) => `${p.title} (${p.status}) [${p.path}.md]`),
      ];
      return lines.join('\n');
    })
  );
}
