import { Router } from 'express';
import { createBug, listBugs } from '../../../../src/store/bugs.js';
import type { ItemStatus } from '../../../../src/types.js';

export const bugsRouter = Router();

bugsRouter.get('/', (req, res) => {
  const project = typeof req.query.project === 'string' ? req.query.project : undefined;
  const status = typeof req.query.status === 'string' ? (req.query.status as ItemStatus) : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  const story = typeof req.query.story === 'string' ? req.query.story : undefined;
  res.json(listBugs(project, status, limit, story));
});

bugsRouter.post('/', (req, res) => {
  const { project, story, title, notes } = req.body ?? {};
  if (!project || !title) {
    return res.status(400).json({ error: 'project and title are required.' });
  }
  try {
    res.status(201).json(createBug(project, title, story, notes));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
