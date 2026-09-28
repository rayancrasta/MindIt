import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { setSpecTransition } from '../store/specs.js';
import { safeHandler } from './common.js';
import { specMarkdownLink } from './specLink.js';
import { transitionSchema } from './specTransition.js';

export function registerSetSpecTransitionTool(server: McpServer): void {
  server.registerTool(
    'set_spec_transition',
    {
      title: 'Set Spec Transition',
      description:
        'Add or update a single entry or exit point on an existing screen by its label, without resending the ' +
        'whole list — if a transition with this label already exists in that direction it is replaced, otherwise ' +
        'it is appended. Everything else on the screen is left untouched. Fails if the screen doesn\'t exist.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        path: z.string().min(1).describe('Path of the screen, e.g. "Checkout/Payment"'),
        direction: z.enum(['entry', 'exit']).describe('Whether this is an entry point or an exit point'),
        transition: transitionSchema.describe('The transition to add or replace, matched by label'),
      },
    },
    safeHandler(({ project, platform, path, direction, transition }) => {
      const screen = setSpecTransition(project, platform as SpecPlatform, path, direction, transition);
      const count = direction === 'entry' ? screen.entryPoints.length : screen.exitPoints.length;
      return `Set ${direction} point "${transition.label}" on "${screen.title}" — ${count} ${direction} point(s) total. ${specMarkdownLink(project, screen.platform, screen.path, screen.title)}`;
    })
  );
}
