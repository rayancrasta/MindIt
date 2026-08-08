import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteBug } from '../store/bugs.js';
import { safeHandler } from './common.js';

export function registerDeleteBugTool(server: McpServer): void {
  server.registerTool(
    'delete_bug',
    {
      title: 'Delete Bug',
      description: 'Delete a bug.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the bug'),
      },
    },
    safeHandler(({ project, match }) => deleteBug(project, match))
  );
}
