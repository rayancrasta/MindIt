import { Router } from 'express';
import { createTask, listTasks } from '../../../../src/store/tasks.js';
import type { ItemStatus } from '../../../../src/types.js';

export const tasksRouter = Router();

tasksRouter.get('/', (req, res) => {
  const project = typeof req.query.project === 'string' ? req.query.project : undefined;
  const status = typeof req.query.status === 'string' ? (req.query.status as ItemStatus) : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  const story = typeof req.query.story === 'string' ? req.query.story : undefined;
  res.json(listTasks(project, status, limit, story));
});

tasksRouter.post('/', (req, res) => {
  const { project, story, title, notes } = req.body ?? {};
  if (!project || !story || !title) {
    return res.status(400).json({ error: 'project, story, and title are required.' });
  }
  try {
    res.status(201).json(createTask(project, story, title, notes));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
