import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { buildSpecJourneyDiagram, listSpecScreensRecursive } from '../store/specs.js';
import { safeHandler } from './common.js';

export function registerGetSpecJourneyTool(server: McpServer): void {
  server.registerTool(
    'get_spec_journey',
    {
      title: 'Get Spec Journey Diagram',
      description:
        'Generate a Mermaid flowchart of every screen and its entry/exit transitions for a project\'s web or ' +
        'mobile spec section (or one folder within it). Journeys aren\'t stored separately — this is always ' +
        'derived on demand from the current entry/exit points, the same diagram the web UI renders. External ' +
        'triggers (app launch, push notification, deep link, etc.) render as rounded start/end nodes.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        folder: z.string().optional().describe('Folder to scope the diagram to; omit for the whole section'),
      },
    },
    safeHandler(({ project, platform, folder }) => {
      const screens = listSpecScreensRecursive(project, platform as SpecPlatform, folder);
      if (screens.length === 0) return 'No spec screens found.';
      return buildSpecJourneyDiagram(screens);
    })
  );
}
