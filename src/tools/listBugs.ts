import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listBugs } from '../store/bugs.js';
import { formatItemList, safeHandler, statusSchema } from './common.js';

export function registerListBugsTool(server: McpServer): void {
  server.registerTool(
    'list_bugs',
    {
      title: 'List Bugs',
      description: 'List bugs, optionally filtered by project, status, and/or parent story.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit to list across all projects'),
        status: statusSchema.optional(),
        limit: z.number().int().positive().optional(),
        story: z
          .string()
          .optional()
          .describe('Id or title (substring) of a story to filter to — requires project'),
      },
    },
    safeHandler(({ project, status, limit, story }) => {
      const bugs = listBugs(project, status, limit, story);
      return formatItemList(bugs, !project);
    })
  );
}
