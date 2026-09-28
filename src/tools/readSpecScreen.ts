import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SPEC_PLATFORMS, type SpecPlatform } from '../types.js';
import { readSpecScreen } from '../store/specs.js';
import { findItemsReferencingSpec } from '../store/items.js';
import { safeHandler } from './common.js';
import { specMarkdownLink } from './specLink.js';
import { formatTransitions, formatTestCases } from './specTransition.js';

export function registerReadSpecScreenTool(server: McpServer): void {
  server.registerTool(
    'read_spec_screen',
    {
      title: 'Read Spec Screen',
      description:
        'Read a screen spec\'s full details by its path — design link, status, entry/exit points, acceptance ' +
        'criteria, test cases, code/data references, description, and which stories/tasks/bugs/features currently ' +
        'reference it.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        platform: z.enum(SPEC_PLATFORMS as [string, ...string[]]).describe('"web" or "mobile"'),
        path: z.string().min(1).describe('Path of the screen, e.g. "Checkout/Payment"'),
      },
    },
    safeHandler(({ project, platform, path }) => {
      const screen = readSpecScreen(project, platform as SpecPlatform, path);
      const referencedBy = findItemsReferencingSpec(project, platform as SpecPlatform, path);
      const lines = [
        `# ${screen.title}`,
        `(${screen.platform}, ${screen.status}, ${specMarkdownLink(project, screen.platform, screen.path, 'open in app')}, updated ${screen.updated})`,
        '',
        screen.designUrl ? `Design: ${screen.designUrl}` : 'Design: (none)',
        screen.tags?.length ? `Tags: ${screen.tags.join(', ')}` : 'Tags: (none)',
        '',
        formatTransitions('Entry points', screen.entryPoints),
        '',
        formatTransitions('Exit points', screen.exitPoints),
        '',
        screen.acceptanceCriteria?.length
          ? `Acceptance criteria:\n${screen.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}`
          : 'Acceptance criteria: (none)',
        '',
        formatTestCases(screen.testCases),
        '',
        screen.codeRefs?.length ? `Code references:\n${screen.codeRefs.map((c) => `- ${c}`).join('\n')}` : 'Code references: (none)',
        '',
        screen.dataRefs?.length ? `Data references:\n${screen.dataRefs.map((c) => `- ${c}`).join('\n')}` : 'Data references: (none)',
        '',
        referencedBy.length
          ? `Referenced by:\n${referencedBy.map((i) => `- ${i.title} [${i.type} #${i.id}]`).join('\n')}`
          : 'Referenced by: (nothing yet)',
        '',
        screen.description || '_No description._',
      ];
      return lines.join('\n');
    })
  );
}
