import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteFeature } from '../store/features.js';
import { safeHandler } from './common.js';

export function registerDeleteFeatureTool(server: McpServer): void {
  server.registerTool(
    'delete_feature',
    {
      title: 'Delete Feature',
      description:
        'Delete a feature. Blocked with a warning if stories are still attached, unless force is set.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the feature'),
        force: z.boolean().optional().describe('Delete even if stories are still attached'),
      },
    },
    safeHandler(({ project, match, force }) => deleteFeature(project, match, force))
  );
}
