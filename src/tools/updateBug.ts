import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateBug } from '../store/bugs.js';
import { safeHandler, statusSchema } from './common.js';

export function registerUpdateBugTool(server: McpServer): void {
  server.registerTool(
    'update_bug',
    {
      title: 'Update Bug',
      description: 'Update a bug\'s status, title, notes, or attach/reassign its parent story.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the bug'),
        status: statusSchema.optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
        story: z.string().optional().describe('Id or title (substring) of a story to attach/reassign to'),
      },
    },
    safeHandler(({ project, match, status, title, notes, story }) => {
      const bug = updateBug(project, match, { status, title, notes, story });
      return `Updated bug "${bug.title}" [${bug.id}] — status: ${bug.status}${bug.story ? `, story: [${bug.story}]` : ''}`;
    })
  );
}
