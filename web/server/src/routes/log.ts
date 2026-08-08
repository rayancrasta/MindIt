import { Router } from 'express';
import { appendSessionEntry, getRecentSessionEntries } from '../../../../src/store/sessions.js';

export const logRouter = Router({ mergeParams: true });

logRouter.get('/', (req, res) => {
  const { project } = req.params as { project: string };
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 10;
  res.json(getRecentSessionEntries(project, limit));
});

logRouter.post('/', (req, res) => {
  const { project } = req.params as { project: string };
  const { done, blockers, next } = req.body ?? {};
  if (!done) return res.status(400).json({ error: 'done is required.' });
  const timestamp = appendSessionEntry(project, { done, blockers, next });
  res.status(201).json({ timestamp });
});
