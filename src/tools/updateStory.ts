import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateStory } from '../store/stories.js';
import { safeHandler, statusSchema } from './common.js';

export function registerUpdateStoryTool(server: McpServer): void {
  server.registerTool(
    'update_story',
    {
      title: 'Update Story',
      description: 'Update a story\'s status, title, notes, or reassign its parent feature.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the story'),
        status: statusSchema.optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
        feature: z.string().optional().describe('Id or title (substring) of a new parent feature'),
      },
    },
    safeHandler(({ project, match, status, title, notes, feature }) => {
      const story = updateStory(project, match, { status, title, notes, feature });
      return `Updated story "${story.title}" [${story.id}] — status: ${story.status}, feature: [${story.feature}]`;
    })
  );
}
