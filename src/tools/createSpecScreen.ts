import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, SPEC_STATUSES, type SpecPlatform, type SpecStatus, type SpecTestCase } from '../types.js';
import { createSpecScreen } from '../store/specs.js';
import { safeHandler } from './common.js';
import { specMarkdownLink } from './specLink.js';
import { transitionSchema, testCaseSchema } from './specTransition.js';

export function registerCreateSpecScreenTool(server: McpServer): void {
  server.registerTool(
    'create_spec_screen',
    {
      title: 'Create Spec Screen',
      description:
        'Create a new screen spec at a folder/file path within a project\'s web or mobile spec section, ' +
        'Obsidian-style (e.g. "Checkout/Payment"). Parent folders are created automatically. Fails if a screen ' +
        'already exists at that path — use update_spec_screen to change one. This is the single source of truth ' +
        'for a screen\'s design link, navigation (entry/exit points), expected behavior (acceptance criteria), ' +
        'required tests, and the code that implements it.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile" — specs for each live in separate sections'),
        path: z.string().min(1).describe('Folder/file path for the screen, e.g. "Checkout/Payment" (".md" optional)'),
        title: z.string().optional().describe('Screen title — defaults to the last path segment'),
        designUrl: z.string().optional().describe('Link to the Figma/design file for this screen'),
        status: z.enum(SPEC_STATUSES as [string, ...string[]]).optional().describe('Design lifecycle status — defaults to "draft"'),
        tags: z.array(z.string()).optional().describe('Freeform tags for grouping/filtering'),
        entryPoints: z.array(transitionSchema).optional().describe('How a user can arrive at this screen'),
        exitPoints: z.array(transitionSchema).optional().describe('Where a user can go from this screen'),
        acceptanceCriteria: z.array(z.string()).optional().describe('Structured behavior/validation rules this screen must satisfy'),
        testCases: z.array(testCaseSchema).optional().describe('Unit/integration test cases required for this screen'),
        codeRefs: z.array(z.string()).optional().describe('File paths/globs in the app repo that implement this screen'),
        dataRefs: z.array(z.string()).optional().describe('Paths of Schema tables (from this same tool) that this screen reads/writes'),
        description: z.string().optional().describe('Free-text description of the screen, in markdown'),
      },
    },
    safeHandler(({ project, platform, path, title, designUrl, status, tags, entryPoints, exitPoints, acceptanceCriteria, testCases, codeRefs, dataRefs, description }) => {
      const screen = createSpecScreen(project, platform as SpecPlatform, path, {
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
      return `Created ${screen.platform} spec screen "${screen.title}" at ${screen.path}.md — link to it from a wiki page or comment with ${specMarkdownLink(project, screen.platform, screen.path, screen.title)}`;
    })
  );
}
