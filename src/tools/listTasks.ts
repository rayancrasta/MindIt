import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listTasks } from '../store/tasks.js';
import { formatItemList, safeHandler, statusSchema } from './common.js';

export function registerListTasksTool(server: McpServer): void {
  server.registerTool(
    'list_tasks',
    {
      title: 'List Tasks',
      description: 'List tasks, optionally filtered by project, status, and/or parent story.',
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
      const tasks = listTasks(project, status, limit, story);
      return formatItemList(tasks, !project);
    })
  );
}
