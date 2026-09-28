import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { unlinkSpecScreens } from '../store/specs.js';
import { safeHandler } from './common.js';
import { specMarkdownLink } from './specLink.js';

export function registerUnlinkSpecScreensTool(server: McpServer): void {
  server.registerTool(
    'unlink_spec_screens',
    {
      title: 'Unlink Spec Screens',
      description:
        'Removes a link created by link_spec_screens from both sides — the exit point on "from" and the matching ' +
        'entry point on "to". No-op (not an error) on whichever side no longer has the matching transition.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        from: z.string().min(1).describe('Path of the source screen the exit point is removed from'),
        to: z.string().min(1).describe('Path of the destination screen the entry point is removed from'),
        label: z.string().min(1).describe('Label of the exit point on "from" to remove'),
        backLabel: z
          .string()
          .optional()
          .describe('Label of the entry point on "to" to remove; defaults to the same label as "from" if omitted'),
      },
    },
    safeHandler(({ project, platform, from, to, label, backLabel }) => {
      const { from: fromScreen, to: toScreen } = unlinkSpecScreens(project, platform as SpecPlatform, {
        from,
        to,
        label,
        backLabel,
      });
      return (
        `Unlinked "${fromScreen.title}" from "${toScreen.title}".\n` +
        `${specMarkdownLink(project, fromScreen.platform, fromScreen.path, fromScreen.title)} / ` +
        `${specMarkdownLink(project, toScreen.platform, toScreen.path, toScreen.title)}`
      );
    })
  );
}
