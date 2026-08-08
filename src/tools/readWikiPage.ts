import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readWikiPage } from '../store/wiki.js';
import { safeHandler } from './common.js';
import { wikiLink } from './wikiLink.js';

export function registerReadWikiPageTool(server: McpServer): void {
  server.registerTool(
    'read_wiki_page',
    {
      title: 'Read Wiki Page',
      description: 'Read a wiki page\'s title and full markdown body by its path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the page, e.g. "Architecture/Database Design"'),
      },
    },
    safeHandler(({ project, path }) => {
      const page = readWikiPage(project, path);
      return (
        `# ${page.title}\n(${wikiLink(project, page.path)}, updated ${page.updated})\n\n` +
        (page.content || '_This page is empty._')
      );
    })
  );
}
