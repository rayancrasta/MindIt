import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTask } from '../store/tasks.js';
import { safeHandler } from './common.js';

export function registerAddTaskTool(server: McpServer): void {
  server.registerTool(
    'add_task',
    {
      title: 'Add Task',
      description: 'Create a new task under a story.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        story: z.string().min(1).describe('Id or title (substring) of the parent story'),
        title: z.string().min(1).describe('Task title'),
        notes: z.string().optional().describe('Free-text notes'),
      },
    },
    safeHandler(({ project, story, title, notes }) => {
      const task = createTask(project, story, title, notes);
      return `Created task "${task.title}" [${task.id}] under story [${task.story}]`;
    })
  );
}
