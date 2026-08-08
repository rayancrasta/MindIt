import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { appendWikiPage } from '../store/wiki.js';
import { safeHandler } from './common.js';
import { wikiLink } from './wikiLink.js';

export function registerAppendWikiPageTool(server: McpServer): void {
  server.registerTool(
    'append_wiki_page',
    {
      title: 'Append to Wiki Page',
      description:
        'Add markdown to the end of a wiki page — the go-to tool for capturing knowledge as you go. ' +
        'Creates the page (and any parent folders) if it doesn\'t exist yet.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z
          .string()
          .min(1)
          .describe('Folder/file path for the page, e.g. "Architecture/Database Design" (".md" optional)'),
        content: z.string().min(1).describe('Markdown to append'),
      },
    },
    safeHandler(({ project, path, content }) => {
      const page = appendWikiPage(project, path, content);
      return `Appended to wiki page "${page.title}" at ${page.path}.md — link to it from a comment with ${wikiLink(project, page.path)}`;
    })
  );
}
