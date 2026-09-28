import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { deleteSpecScreen } from '../store/specs.js';
import { safeHandler } from './common.js';

export function registerDeleteSpecScreenTool(server: McpServer): void {
  server.registerTool(
    'delete_spec_screen',
    {
      title: 'Delete Spec Screen',
      description: 'Delete a screen spec by its path. Fails if no screen exists at that path.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        path: z.string().min(1).describe('Path of the screen to delete, e.g. "Checkout/Payment"'),
      },
    },
    safeHandler(({ project, platform, path }) => {
      const screen = deleteSpecScreen(project, platform as SpecPlatform, path);
      return `Deleted ${screen.platform} spec screen "${screen.title}" at ${screen.path}.md.`;
    })
  );
}
