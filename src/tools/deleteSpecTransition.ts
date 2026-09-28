import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { deleteSpecTransition } from '../store/specs.js';
import { safeHandler } from './common.js';
import { specMarkdownLink } from './specLink.js';

export function registerDeleteSpecTransitionTool(server: McpServer): void {
  server.registerTool(
    'delete_spec_transition',
    {
      title: 'Delete Spec Transition',
      description:
        'Remove a single entry or exit point from a screen by direction and label, without resending the whole ' +
        'list. Everything else on the screen is left untouched. Fails if no such transition exists.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        path: z.string().min(1).describe('Path of the screen, e.g. "Checkout/Payment"'),
        direction: z.enum(['entry', 'exit']).describe('Whether to remove an entry point or an exit point'),
        label: z.string().min(1).describe('Label of the transition to remove'),
      },
    },
    safeHandler(({ project, platform, path, direction, label }) => {
      const screen = deleteSpecTransition(project, platform as SpecPlatform, path, direction, label);
      const count = direction === 'entry' ? screen.entryPoints.length : screen.exitPoints.length;
      return `Removed ${direction} point "${label}" from "${screen.title}" — ${count} ${direction} point(s) remain. ${specMarkdownLink(project, screen.platform, screen.path, screen.title)}`;
    })
  );
}
