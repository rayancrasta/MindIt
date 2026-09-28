import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { unlinkSpec } from '../store/items.js';
import { safeHandler } from './common.js';

export function registerUnlinkSpecTool(server: McpServer): void {
  server.registerTool(
    'unlink_spec',
    {
      title: 'Unlink Spec',
      description: 'Remove a spec screen link from a feature, story, task, or bug. No-op if it wasn\'t linked.',
      inputSchema: {
        id: z.string().min(1).describe('Id of the feature/story/task/bug to unlink'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        path: z.string().min(1).describe('Path of the spec screen, e.g. "Checkout/Payment"'),
      },
    },
    safeHandler(({ id, platform, path }) => {
      const item = unlinkSpec(id, platform as SpecPlatform, path);
      return `Unlinked "${item.title}" [${item.type} #${item.id}] from ${platform} spec "${path}".`;
    })
  );
}
