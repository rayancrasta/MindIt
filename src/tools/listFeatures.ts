import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listFeatures } from '../store/features.js';
import { formatItemList, safeHandler, statusSchema } from './common.js';

export function registerListFeaturesTool(server: McpServer): void {
  server.registerTool(
    'list_features',
    {
      title: 'List Features',
      description: 'List features, optionally filtered by project and/or status.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit to list across all projects'),
        status: statusSchema.optional(),
        limit: z.number().int().positive().optional(),
      },
    },
    safeHandler(({ project, status, limit }) => {
      const features = listFeatures(project, status, limit);
      return formatItemList(features, !project);
    })
  );
}
