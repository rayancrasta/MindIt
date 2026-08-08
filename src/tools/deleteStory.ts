import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteStory } from '../store/stories.js';
import { safeHandler } from './common.js';

export function registerDeleteStoryTool(server: McpServer): void {
  server.registerTool(
    'delete_story',
    {
      title: 'Delete Story',
      description:
        'Delete a story. Blocked with a warning if tasks/bugs are still attached, unless force is set.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the story'),
        force: z.boolean().optional().describe('Delete even if tasks/bugs are still attached'),
      },
    },
    safeHandler(({ project, match, force }) => deleteStory(project, match, force))
  );
}
