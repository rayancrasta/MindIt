import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createStory } from '../store/stories.js';
import { safeHandler } from './common.js';

export function registerAddStoryTool(server: McpServer): void {
  server.registerTool(
    'add_story',
    {
      title: 'Add Story',
      description: 'Create a new user story under a feature.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        feature: z.string().min(1).describe('Id or title (substring) of the parent feature'),
        title: z.string().min(1).describe('Story title'),
        notes: z.string().optional().describe('Free-text notes'),
      },
    },
    safeHandler(({ project, feature, title, notes }) => {
      const story = createStory(project, feature, title, notes);
      return `Created story "${story.title}" [${story.id}] under feature [${story.feature}]`;
    })
  );
}
