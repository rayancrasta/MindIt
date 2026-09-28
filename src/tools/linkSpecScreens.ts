import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { linkSpecScreens } from '../store/specs.js';
import { safeHandler } from './common.js';
import { specMarkdownLink } from './specLink.js';

export function registerLinkSpecScreensTool(server: McpServer): void {
  server.registerTool(
    'link_spec_screens',
    {
      title: 'Link Spec Screens',
      description:
        'Link two screens across journeys/folders in one call — adds an exit point on "from" targeting "to", ' +
        'and a matching entry point back on "to" targeting "from", so the two sides never drift out of sync. ' +
        'Calling it again with the same from/to/label replaces both transitions rather than duplicating them. ' +
        'Fails if either screen doesn\'t exist, or if from and to are the same screen.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        from: z.string().min(1).describe('Path of the source screen, which gets the new exit point, e.g. "Checkout/Cart"'),
        to: z.string().min(1).describe('Path of the destination screen, which gets the new entry point back, e.g. "Catalog/Wishlist"'),
        label: z.string().min(1).describe('Label for the exit point on "from", e.g. "Save for later"'),
        backLabel: z
          .string()
          .optional()
          .describe('Label for the entry point on "to"; defaults to the same label as "from" if omitted'),
      },
    },
    safeHandler(({ project, platform, from, to, label, backLabel }) => {
      const { from: fromScreen, to: toScreen } = linkSpecScreens(project, platform as SpecPlatform, {
        from,
        to,
        label,
        backLabel,
      });
      const resolvedBackLabel = backLabel?.trim() || label;
      return (
        `Linked "${fromScreen.title}" -> "${toScreen.title}" (exit "${label}" on ${fromScreen.path} / entry "${resolvedBackLabel}" on ${toScreen.path}).\n` +
        `${specMarkdownLink(project, fromScreen.platform, fromScreen.path, fromScreen.title)} -> ` +
        `${specMarkdownLink(project, toScreen.platform, toScreen.path, toScreen.title)}`
      );
    })
  );
}
