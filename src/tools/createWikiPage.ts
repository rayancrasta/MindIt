import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createWikiPage } from '../store/wiki.js';
import { safeHandler } from './common.js';
import { wikiLink } from './wikiLink.js';

export function registerCreateWikiPageTool(server: McpServer): void {
  server.registerTool(
    'create_wiki_page',
    {
      title: 'Create Wiki Page',
      description:
        'Create a new wiki page at a folder/file path within a project, Obsidian-style (e.g. "Architecture/Database Design"). ' +
        'Parent folders are created automatically. Fails if a page already exists at that path — use update_wiki_page or ' +
        'append_wiki_page to change one. Markdown is supported.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z
          .string()
          .min(1)
          .describe('Folder/file path for the page, e.g. "Architecture/Database Design" (".md" optional)'),
        content: z.string().optional().describe('Initial markdown body'),
        title: z.string().optional().describe('Page title — defaults to the last path segment'),
      },
    },
    safeHandler(({ project, path, content, title }) => {
      const page = createWikiPage(project, path, content ?? '', title);
      return `Created wiki page "${page.title}" at ${page.path}.md — link to it from a comment with ${wikiLink(project, page.path)}`;
    })
  );
}
