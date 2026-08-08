import { Router } from 'express';
import { createStory, listStories, linkStories, unlinkStories } from '../../../../src/store/stories.js';
import { findItemGlobal } from '../../../../src/store/items.js';
import type { ItemStatus } from '../../../../src/types.js';

export const storiesRouter = Router();

storiesRouter.get('/', (req, res) => {
  const project = typeof req.query.project === 'string' ? req.query.project : undefined;
  const status = typeof req.query.status === 'string' ? (req.query.status as ItemStatus) : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  const feature = typeof req.query.feature === 'string' ? req.query.feature : undefined;
  res.json(listStories(project, status, limit, feature));
});

storiesRouter.post('/', (req, res) => {
  const { project, feature, title, notes } = req.body ?? {};
  if (!project || !feature || !title) {
    return res.status(400).json({ error: 'project, feature, and title are required.' });
  }
  try {
    res.status(201).json(createStory(project, feature, title, notes));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

storiesRouter.post('/:id/link', (req, res) => {
  const found = findItemGlobal(req.params.id);
  if (!found || found.type !== 'story') return res.status(404).json({ error: 'Story not found.' });
  const { other } = req.body ?? {};
  if (!other) return res.status(400).json({ error: 'other is required.' });
  res.json({ message: linkStories(found.project, found.item.id, other) });
});

storiesRouter.delete('/:id/link/:other', (req, res) => {
  const found = findItemGlobal(req.params.id);
  if (!found || found.type !== 'story') return res.status(404).json({ error: 'Story not found.' });
  res.json({ message: unlinkStories(found.project, found.item.id, req.params.other) });
});
