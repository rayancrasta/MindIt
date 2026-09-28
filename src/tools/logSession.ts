import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { appendSessionEntry } from '../store/sessions.js';
import { safeHandler } from './common.js';

export function registerLogSessionTool(server: McpServer): void {
  server.registerTool(
    'log_session',
    {
      title: 'Log Session',
      description: 'Append a session log entry for a project — what was done, blockers, next step.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        done: z.string().min(1).describe('What was done this session'),
        blockers: z.string().optional().describe('Anything blocking progress'),
        next: z.string().optional().describe('Suggested next step'),
        items: z
          .array(z.string())
          .optional()
          .describe('IDs of features/stories/tasks/bugs touched this session, e.g. ["12", "15"]'),
      },
    },
    safeHandler(({ project, done, blockers, next, items }) => {
      const timestamp = appendSessionEntry(project, { done, blockers, next, items });
      return `Logged session entry for ${project} at ${timestamp}`;
    })
  );
}
