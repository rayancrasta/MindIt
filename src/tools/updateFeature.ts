import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateFeature } from '../store/features.js';
import { safeHandler, statusSchema } from './common.js';

export function registerUpdateFeatureTool(server: McpServer): void {
  server.registerTool(
    'update_feature',
    {
      title: 'Update Feature',
      description: 'Update a feature\'s status, title, or notes.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        match: z.string().min(1).describe('Id or title (substring) of the feature'),
        status: statusSchema.optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    safeHandler(({ project, match, status, title, notes }) => {
      const feature = updateFeature(project, match, { status, title, notes });
      return `Updated feature "${feature.title}" [${feature.id}] — status: ${feature.status}`;
    })
  );
}
