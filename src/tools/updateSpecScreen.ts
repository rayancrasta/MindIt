import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, SPEC_STATUSES, type SpecPlatform, type SpecStatus, type SpecTestCase } from '../types.js';
import { updateSpecScreen } from '../store/specs.js';
import { safeHandler } from './common.js';
import { specMarkdownLink } from './specLink.js';
import { transitionSchema, testCaseSchema } from './specTransition.js';

export function registerUpdateSpecScreenTool(server: McpServer): void {
  server.registerTool(
    'update_spec_screen',
    {
      title: 'Update Spec Screen',
      description:
        'Update an existing screen spec. Every field is optional and a field left out keeps its current value — ' +
        'only the fields you pass are overwritten (pass an empty array to clear a list field). Fails if the screen ' +
        'doesn\'t exist — use create_spec_screen for that.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        path: z.string().min(1).describe('Path of the screen to update, e.g. "Checkout/Payment"'),
        title: z.string().optional().describe('New title'),
        designUrl: z.string().optional().describe('New link to the Figma/design file for this screen'),
        status: z.enum(SPEC_STATUSES as [string, ...string[]]).optional().describe('New design lifecycle status'),
        tags: z.array(z.string()).optional().describe('New full tag list, replacing the existing one'),
        entryPoints: z.array(transitionSchema).optional().describe('New full entry-point list, replacing the existing one'),
        exitPoints: z.array(transitionSchema).optional().describe('New full exit-point list, replacing the existing one'),
        acceptanceCriteria: z.array(z.string()).optional().describe('New full acceptance criteria list, replacing the existing one'),
        testCases: z.array(testCaseSchema).optional().describe('New full test case list, replacing the existing one'),
        codeRefs: z.array(z.string()).optional().describe('New full code reference list, replacing the existing one'),
        dataRefs: z.array(z.string()).optional().describe('New full data reference list, replacing the existing one'),
        description: z.string().optional().describe('New free-text description, replacing the existing one'),
      },
    },
    safeHandler(({ project, platform, path, title, designUrl, status, tags, entryPoints, exitPoints, acceptanceCriteria, testCases, codeRefs, dataRefs, description }) => {
      const screen = updateSpecScreen(project, platform as SpecPlatform, path, {
        title,
        designUrl,
        status: status as SpecStatus | undefined,
        tags,
        entryPoints,
        exitPoints,
        acceptanceCriteria,
        testCases: testCases as SpecTestCase[] | undefined,
        codeRefs,
        dataRefs,
        description,
      });
      return `Updated ${screen.platform} spec screen "${screen.title}" at ${screen.path}.md — ${specMarkdownLink(project, screen.platform, screen.path, screen.title)}`;
    })
  );
}
