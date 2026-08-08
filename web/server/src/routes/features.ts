import { Router } from 'express';
import { createFeature, listFeatures } from '../../../../src/store/features.js';
import type { ItemStatus } from '../../../../src/types.js';

export const featuresRouter = Router();

featuresRouter.get('/', (req, res) => {
  const project = typeof req.query.project === 'string' ? req.query.project : undefined;
  const status = typeof req.query.status === 'string' ? (req.query.status as ItemStatus) : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  res.json(listFeatures(project, status, limit));
});

featuresRouter.post('/', (req, res) => {
  const { project, title, notes } = req.body ?? {};
  if (!project || !title) return res.status(400).json({ error: 'project and title are required.' });
  try {
    res.status(201).json(createFeature(project, title, notes));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
