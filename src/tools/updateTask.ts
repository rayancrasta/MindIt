import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateTask } from '../store/tasks.js';
import { safeHandler, statusSchema } from './common.js';

export function registerUpdateTaskTool(server: McpServer): void {
  server.registerTool(
    'update_task',
    {
      title: 'Update Task',
      description: 'Update a task\'s status, title, notes, or reassign its parent story.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the task'),
        status: statusSchema.optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
        story: z.string().optional().describe('Id or title (substring) of a new parent story'),
      },
    },
    safeHandler(({ project, match, status, title, notes, story }) => {
      const task = updateTask(project, match, { status, title, notes, story });
      return `Updated task "${task.title}" [${task.id}] — status: ${task.status}, story: [${task.story}]`;
    })
  );
}
