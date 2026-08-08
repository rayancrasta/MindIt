import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateWikiPage } from '../store/wiki.js';
import { safeHandler } from './common.js';
import { wikiLink } from './wikiLink.js';

export function registerUpdateWikiPageTool(server: McpServer): void {
  server.registerTool(
    'update_wiki_page',
    {
      title: 'Update Wiki Page',
      description:
        'Overwrite the full body of an existing wiki page. Fails if the page doesn\'t exist — use create_wiki_page for that, ' +
        'or append_wiki_page to add to it instead of replacing it.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the page to update, e.g. "Architecture/Database Design"'),
        content: z.string().describe('New full markdown body, replacing the existing one'),
      },
    },
    safeHandler(({ project, path, content }) => {
      const page = updateWikiPage(project, path, content);
      return `Updated wiki page "${page.title}" at ${page.path}.md — ${wikiLink(project, page.path)}`;
    })
  );
}
