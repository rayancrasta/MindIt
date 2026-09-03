import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listFeaturesWithStats, type FeatureWithStats } from '../store/featureStats.js';
import { safeHandler, statusSchema } from './common.js';

function formatFeatureList(features: FeatureWithStats[], showProject: boolean): string {
  if (features.length === 0) return 'None found.';
  return features
    .map((f) => {
      const { total, completed, complete } = f.storyStats;
      const storiesPart = total > 0 ? ` — stories: ${completed}/${total} done${complete ? ' [COMPLETE]' : ''}` : '';
      return `${f.title} [${f.id}] (${f.status})${showProject ? ` — ${f.project}` : ''}${storiesPart}`;
    })
    .join('\n');
}

export function registerListFeaturesTool(server: McpServer): void {
  server.registerTool(
    'list_features',
    {
      title: 'List Features',
      description: 'List features, optionally filtered by project and/or status. Each entry includes its story completion count.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit to list across all projects'),
        status: statusSchema.optional(),
        limit: z.number().int().positive().optional(),
      },
    },
    safeHandler(({ project, status, limit }) => {
      const features = listFeaturesWithStats(project, status, limit);
      return formatFeatureList(features, !project);
    })
  );
}
