import { Router } from 'express';
import { appendSessionEntry, getRecentSessionEntries, searchSessionEntries } from '../../../../src/store/sessions.js';
import { resolveItemRefs } from '../../../../src/store/items.js';

export const logRouter = Router({ mergeParams: true });

logRouter.get('/', (req, res) => {
  const { project } = req.params as { project: string };
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 10;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const [query, item, since, until] = [req.query.q, req.query.item, req.query.since, req.query.until].map(str);
  const entries =
    query || item || since || until
      ? searchSessionEntries(project, { query, item, since, until, limit })
      : getRecentSessionEntries(project, limit);
  res.json(entries.map((entry) => ({ ...entry, touchedItems: resolveItemRefs(entry.items) })));
});

logRouter.post('/', (req, res) => {
  const { project } = req.params as { project: string };
  const { done, blockers, next, items } = req.body ?? {};
  if (!done) return res.status(400).json({ error: 'done is required.' });
  const timestamp = appendSessionEntry(project, { done, blockers, next, items });
  res.status(201).json({ timestamp });
});
