import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { linkStories } from '../store/stories.js';
import { safeHandler } from './common.js';

export function registerLinkStoriesTool(server: McpServer): void {
  server.registerTool(
    'link_stories',
    {
      title: 'Link Stories',
      description: 'Create a symmetric "related to" link between two stories.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        a: z.string().min(1).describe('Id or title (substring) of the first story'),
        b: z.string().min(1).describe('Id or title (substring) of the second story'),
      },
    },
    safeHandler(({ project, a, b }) => linkStories(project, a, b))
  );
}
