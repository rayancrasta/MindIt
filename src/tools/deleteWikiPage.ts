import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteWikiPage } from '../store/wiki.js';
import { safeHandler } from './common.js';

export function registerDeleteWikiPageTool(server: McpServer): void {
  server.registerTool(
    'delete_wiki_page',
    {
      title: 'Delete Wiki Page',
      description: 'Delete a wiki page by its path. Fails if no page exists at that path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the page to delete, e.g. "Architecture/Database Design"'),
      },
    },
    safeHandler(({ project, path }) => {
      const page = deleteWikiPage(project, path);
      return `Deleted wiki page "${page.title}" at ${page.path}.md.`;
    })
  );
}
