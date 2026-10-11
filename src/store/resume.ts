import { listItems, resolveItemRefs } from './items.js';
import { listProjectSlugs } from './paths.js';
import { getLastSessionEntry } from './sessions.js';
import { listAssumptionsForReview } from './assumptions.js';
import { getLastDeploymentNote } from './deployments.js';
import type { ItemStatus, ItemType } from '../types.js';

export const PENDING_STATUSES: ItemStatus[] = ['new', 'in_progress', 'testing'];

function pendingItems(type: ItemType, project: string) {
  return listItems(type, project).filter((i) => PENDING_STATUSES.includes(i.status));
}

/** Everything a "where did we leave off" recap needs for one project. Shared by get_resume and the web route. */
export function resumeForProject(project: string) {
  const lastSession = getLastSessionEntry(project);
  return {
    pendingFeatures: pendingItems('feature', project),
    pendingStories: pendingItems('story', project),
    pendingTasks: pendingItems('task', project),
    pendingBugs: pendingItems('bug', project),
    lastSession,
    lastSessionTouchedItems: resolveItemRefs(lastSession?.items),
    lastDeployment: getLastDeploymentNote(project),
    assumptionsToReview: listAssumptionsForReview(project, 5),
  };
}

export type Resume = ReturnType<typeof resumeForProject>;

/** Recaps for every registered project that has anything to report. */
export function resumeForAllProjects(): Record<string, Resume> {
  const result: Record<string, Resume> = {};
  for (const slug of listProjectSlugs()) {
    const r = resumeForProject(slug);
    const hasPending =
      r.pendingFeatures.length || r.pendingStories.length || r.pendingTasks.length || r.pendingBugs.length;
    if (hasPending || r.lastSession || r.lastDeployment || r.assumptionsToReview.length) result[slug] = r;
  }
  return result;
}
