import { Router } from 'express';
import { listItems } from '../../../../src/store/items.js';
import { listProjectSlugs } from '../../../../src/store/paths.js';
import { getLastSessionEntry } from '../../../../src/store/sessions.js';
import type { ItemStatus, ItemType } from '../../../../src/types.js';

export const resumeRouter = Router();

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

resumeRouter.get('/', (req, res) => {
  const project = typeof req.query.project === 'string' ? req.query.project : undefined;
  if (project) {
    return res.json(resumeForProject(project));
  }
  const result: Record<string, unknown> = {};
  for (const slug of listProjectSlugs()) {
    const r = resumeForProject(slug);
    const hasPending =
      r.pendingFeatures.length || r.pendingStories.length || r.pendingTasks.length || r.pendingBugs.length;
    if (hasPending || r.lastSession) result[slug] = r;
  }
  res.json(result);
});
