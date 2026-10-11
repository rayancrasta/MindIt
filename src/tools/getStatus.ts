import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listItems } from '../store/items.js';
import { listProjectSlugs } from '../store/paths.js';
import { ITEM_STATUSES, ITEM_TYPES, type ItemType } from '../types.js';
import { safeHandler } from './common.js';

function countsForProject(project: string): Record<ItemType, Record<string, number>> {
  const counts = {} as Record<ItemType, Record<string, number>>;
  for (const type of ITEM_TYPES) {
    const byStatus: Record<string, number> = {};
    for (const s of ITEM_STATUSES) byStatus[s] = 0;
    for (const item of listItems(type, project)) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }
    counts[type] = byStatus;
  }
  return counts;
}

/** One line per type, zero counts left out, e.g. "story: in_progress 2, new 20, resolved 32". */
function statusLines(counts: Record<ItemType, Record<string, number>>): string {
  return ITEM_TYPES.map((type) => {
    const parts = ITEM_STATUSES.filter((s) => counts[type][s]).map((s) => `${s} ${counts[type][s]}`);
    return `${type}: ${parts.join(', ') || 'none'}`;
  }).join('\n');
}

export function registerGetStatusTool(server: McpServer): void {
  server.registerTool(
    'get_status',
    {
      title: 'Get Status',
      description: 'Get counts of features/stories/tasks/bugs by status, for one project or all.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit for counts across all projects'),
      },
    },
    safeHandler(({ project }) => {
      if (project) {
        return statusLines(countsForProject(project));
      }
      return listProjectSlugs()
        .map((slug) => `# ${slug}\n${statusLines(countsForProject(slug))}`)
        .join('\n\n');
    })
  );
}
