import { Router } from 'express';
import { createProject, listProjects, removeProject, renameProject } from '../../../../src/store/paths.js';

export const projectsRouter = Router();

projectsRouter.get('/', (_req, res) => {
  res.json(listProjects());
});

projectsRouter.post('/', (req, res) => {
  const { name, path } = req.body ?? {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required.' });
  try {
    res.status(201).json(createProject({ name, path: typeof path === 'string' ? path : undefined }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

projectsRouter.patch('/:slug', (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required.' });
  try {
    res.json(renameProject(req.params.slug, name));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

projectsRouter.delete('/:slug', (req, res) => {
  try {
    removeProject(req.params.slug);
    res.json({ message: 'Project removed.' });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
