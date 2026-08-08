import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { unlinkStories } from '../store/stories.js';
import { safeHandler } from './common.js';

export function registerUnlinkStoriesTool(server: McpServer): void {
  server.registerTool(
    'unlink_stories',
    {
      title: 'Unlink Stories',
      description: 'Remove the "related to" link between two stories.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        a: z.string().min(1).describe('Id or title (substring) of the first story'),
        b: z.string().min(1).describe('Id or title (substring) of the second story'),
      },
    },
    safeHandler(({ project, a, b }) => unlinkStories(project, a, b))
  );
}
