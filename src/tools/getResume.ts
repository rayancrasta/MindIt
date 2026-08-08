import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listItems } from '../store/items.js';
import { listProjectSlugs } from '../store/paths.js';
import { getLastSessionEntry } from '../store/sessions.js';
import type { ItemStatus, ItemType } from '../types.js';
import { safeHandler } from './common.js';

const PENDING_STATUSES: ItemStatus[] = ['new', 'in_progress', 'testing'];

function pendingItems(type: ItemType, project: string) {
  return listItems(type, project).filter((i) => PENDING_STATUSES.includes(i.status));
}

function resumeForProject(project: string) {
  return {
    pendingFeatures: pendingItems('feature', project),
    pendingStories: pendingItems('story', project),
    pendingTasks: pendingItems('task', project),
    pendingBugs: pendingItems('bug', project),
    lastSession: getLastSessionEntry(project),
  };
}

export function registerGetResumeTool(server: McpServer): void {
  server.registerTool(
    'get_resume',
    {
      title: 'Get Resume',
      description:
        'Get a recap of pending features/stories/tasks/bugs and the last session entry, for one project or all.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit for a cross-project recap'),
      },
    },
    safeHandler(({ project }) => {
      if (project) {
        return JSON.stringify(resumeForProject(project), null, 2);
      }
      const result: Record<string, unknown> = {};
      for (const slug of listProjectSlugs()) {
        const r = resumeForProject(slug);
        const hasPending =
          r.pendingFeatures.length || r.pendingStories.length || r.pendingTasks.length || r.pendingBugs.length;
        if (hasPending || r.lastSession) result[slug] = r;
      }
      return JSON.stringify(result, null, 2);
    })
  );
}
