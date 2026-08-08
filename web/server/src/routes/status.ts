import { Router } from 'express';
import { listItems } from '../../../../src/store/items.js';
import { listProjectSlugs } from '../../../../src/store/paths.js';
import { ITEM_STATUSES, ITEM_TYPES, type ItemType } from '../../../../src/types.js';

export const statusRouter = Router();

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

statusRouter.get('/', (req, res) => {
  const project = typeof req.query.project === 'string' ? req.query.project : undefined;
  if (project) {
    return res.json(countsForProject(project));
  }
  const result: Record<string, unknown> = {};
  for (const slug of listProjectSlugs()) {
    result[slug] = countsForProject(slug);
  }
  res.json(result);
});
