import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { linkSpec } from '../store/items.js';
import { safeHandler } from './common.js';

export function registerLinkSpecTool(server: McpServer): void {
  server.registerTool(
    'link_spec',
    {
      title: 'Link Spec',
      description:
        'Link a feature, story, task, or bug to a spec screen — a one-directional reference stored on the item. ' +
        'Fails if the item or the spec screen doesn\'t exist.',
      inputSchema: {
        id: z.string().min(1).describe('Id of the feature/story/task/bug to link'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        path: z.string().min(1).describe('Path of the spec screen, e.g. "Checkout/Payment"'),
      },
    },
    safeHandler(({ id, platform, path }) => {
      const item = linkSpec(id, platform as SpecPlatform, path);
      return `Linked "${item.title}" [${item.type} #${item.id}] -> ${platform} spec "${path}".`;
    })
  );
}
