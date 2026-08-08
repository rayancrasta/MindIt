import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createBug } from '../store/bugs.js';
import { safeHandler } from './common.js';

export function registerAddBugTool(server: McpServer): void {
  server.registerTool(
    'add_bug',
    {
      title: 'Add Bug',
      description: 'Create a new bug, optionally attached to a story.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        title: z.string().min(1).describe('Bug title'),
        story: z.string().optional().describe('Id or title (substring) of a story to attach this bug to'),
        notes: z.string().optional().describe('Free-text notes'),
      },
    },
    safeHandler(({ project, title, story, notes }) => {
      const bug = createBug(project, title, story, notes);
      return `Created bug "${bug.title}" [${bug.id}]${bug.story ? ` under story [${bug.story}]` : ''}`;
    })
  );
}
