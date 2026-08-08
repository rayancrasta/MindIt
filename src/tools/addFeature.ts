import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createFeature } from '../store/features.js';
import { safeHandler } from './common.js';

export function registerAddFeatureTool(server: McpServer): void {
  server.registerTool(
    'add_feature',
    {
      title: 'Add Feature',
      description: 'Create a new feature in a project.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        title: z.string().min(1).describe('Feature title'),
        notes: z.string().optional().describe('Free-text notes'),
      },
    },
    safeHandler(({ project, title, notes }) => {
      const feature = createFeature(project, title, notes);
      return `Created feature "${feature.title}" [${feature.id}]`;
    })
  );
}
