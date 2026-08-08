import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteTask } from '../store/tasks.js';
import { safeHandler } from './common.js';

export function registerDeleteTaskTool(server: McpServer): void {
  server.registerTool(
    'delete_task',
    {
      title: 'Delete Task',
      description: 'Delete a task.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the task'),
      },
    },
    safeHandler(({ project, match }) => deleteTask(project, match))
  );
}
