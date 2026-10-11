import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resumeForAllProjects, resumeForProject, type Resume } from '../store/resume.js';
import { searchSessionEntries } from '../store/sessions.js';
import type { Item, ItemStatus } from '../types.js';
import { clip, firstParagraph, safeHandler } from './common.js';

// Pending items in the order a recap should read them: what's moving, what's waiting on a test, what's queued.
const STATUS_ORDER: ItemStatus[] = ['in_progress', 'testing', 'new'];

function parentOf(i: Item): string {
  if (i.type === 'story') return ` (feature ${i.feature})`;
  if ((i.type === 'task' || i.type === 'bug') && i.story) return ` (story ${i.story})`;
  return '';
}

function itemLine(i: Item): string {
  return `- [${i.status}] ${i.type} ${i.id}: ${i.title}${parentOf(i)}`;
}

function idList(items: Item[]): string {
  return items.map((i) => i.id).join(', ');
}

/**
 * One line per pending item. Without a status filter the two groups that are mostly noise in a recap are
 * collapsed to id lists: features that aren't in progress (they're containers) and items waiting in testing.
 */
function pendingLines(r: Resume, statuses: ItemStatus[] | undefined): string[] {
  const all = [...r.pendingFeatures, ...r.pendingStories, ...r.pendingTasks, ...r.pendingBugs] as Item[];
  const wanted = statuses ?? STATUS_ORDER;
  const pending = all
    .filter((i) => wanted.includes(i.status))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || Number(a.id) - Number(b.id));
  if (pending.length === 0) return ['Pending: none'];

  const counts = STATUS_ORDER.map((s) => [s, pending.filter((i) => i.status === s).length] as const)
    .filter(([, n]) => n)
    .map(([s, n]) => `${s} ${n}`);
  const lines = [`Pending (${pending.length}): ${counts.join(', ')}`];
  if (statuses) return [...lines, ...pending.map(itemLine)];

  const quietFeatures = pending.filter((i) => i.type === 'feature' && i.status !== 'in_progress');
  const testing = pending.filter((i) => i.type !== 'feature' && i.status === 'testing');
  if (quietFeatures.length) lines.push(`- open features (${quietFeatures.length}): ${idList(quietFeatures)}`);
  if (testing.length) lines.push(`- testing (${testing.length}): ${idList(testing)}`);
  const shown = new Set([...quietFeatures, ...testing]);
  return [...lines, ...pending.filter((i) => !shown.has(i)).map(itemLine)];
}

function handoverLines(project: string, r: Resume): string[] {
  const last = searchSessionEntries(project, { limit: 1 })[0];
  if (!last) return ['Last handover: none'];
  const lines = [
    `Last handover: ${last.timestamp} [${last.path}]${last.items?.length ? ` · items: ${last.items.join(', ')}` : ''}`,
    `Summary: ${clip(firstParagraph(last.done), 600)}`,
    last.blockers ? `Blockers: ${last.blockers}` : '',
    last.next ? `Next: ${last.next}` : '',
  ];
  if (r.lastSessionTouchedItems?.length) {
    const touched = r.lastSessionTouchedItems.map((i) => `${i.type} ${i.id} "${i.title}" (${i.status})`);
    lines.push(`Touched: ${touched.join('; ')}`);
  }
  return lines.filter(Boolean);
}

function compactResume(project: string, r: Resume, statuses: ItemStatus[] | undefined): string {
  const d = r.lastDeployment;
  const lines = [
    `# ${project}`,
    ...pendingLines(r, statuses),
    '',
    ...handoverLines(project, r),
  ];
  if (d) {
    lines.push(
      '',
      `Last deployment: ${d.timestamp} · ${d.environment} · ${d.status} · ${d.commitHash}` +
        (d.notes ? ` · ${clip(d.notes, 200)}` : '')
    );
  }
  if (r.assumptionsToReview.length) {
    lines.push('', `Assumptions to review (${r.assumptionsToReview.length}, lowest confidence first):`);
    for (const a of r.assumptionsToReview) {
      lines.push(`- ${a.confidence} · ${a.title}${a.question ? ` — confirm: ${clip(a.question, 200)}` : ''} [${a.id}]`);
    }
  }
  return lines.join('\n');
}

export function registerGetResumeTool(server: McpServer): void {
  server.registerTool(
    'get_resume',
    {
      title: 'Get Resume',
      description:
        'Get a short recap for one project or all: pending features/stories/tasks/bugs one line each (open ' +
        'features and items in testing collapsed to id lists), the latest handover (summary, blockers, next, ' +
        'touched items), the last deployment, and up to 5 unreviewed assumptions. Use get_item for an item\'s ' +
        'notes and comments, search_handoffs for older handovers, or detail: true for every field as JSON.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit for a cross-project recap'),
        status: z
          .array(z.enum(['new', 'in_progress', 'testing']))
          .optional()
          .describe('Only pending items in these statuses, one line each with nothing collapsed'),
        detail: z
          .boolean()
          .optional()
          .describe('Return the full recap as JSON (every item with notes, comments and timestamps). Large.'),
      },
    },
    safeHandler(({ project, status, detail }) => {
      const statuses = status?.length ? (status as ItemStatus[]) : undefined;
      if (project) {
        const r = resumeForProject(project);
        return detail ? JSON.stringify(r) : compactResume(project, r, statuses);
      }
      const all = resumeForAllProjects();
      if (detail) return JSON.stringify(all);
      const blocks = Object.entries(all).map(([slug, r]) => compactResume(slug, r, statuses));
      return blocks.length ? blocks.join('\n\n') : 'Nothing pending in any project.';
    })
  );
}
