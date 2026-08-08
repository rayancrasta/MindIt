import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listStories } from '../store/stories.js';
import { formatItemList, safeHandler, statusSchema } from './common.js';

export function registerListStoriesTool(server: McpServer): void {
  server.registerTool(
    'list_stories',
    {
      title: 'List Stories',
      description: 'List stories, optionally filtered by project, status, and/or parent feature.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit to list across all projects'),
        status: statusSchema.optional(),
        limit: z.number().int().positive().optional(),
        feature: z
          .string()
          .optional()
          .describe('Id or title (substring) of a feature to filter to — requires project'),
      },
    },
    safeHandler(({ project, status, limit, feature }) => {
      const stories = listStories(project, status, limit, feature);
      return formatItemList(stories, !project);
    })
  );
}
