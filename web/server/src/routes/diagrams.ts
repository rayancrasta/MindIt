import { Router } from 'express';
import {
  createDiagram,
  deleteDiagram,
  getDiagramTree,
  listDiagramFolder,
  readDiagram,
  updateDiagram,
} from '../../../../src/store/diagrams.js';

export const diagramsRouter = Router({ mergeParams: true });

function pathParam(req: { query: Record<string, unknown> }): string {
  const p = req.query.path;
  return typeof p === 'string' ? p : '';
}

diagramsRouter.get('/tree', (req, res) => {
  const { project } = req.params as { project: string };
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  try {
    if (req.query.recursive === 'true') {
      res.json(getDiagramTree(project, folder));
    } else {
      res.json(listDiagramFolder(project, folder));
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

diagramsRouter.get('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(readDiagram(project, path));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

diagramsRouter.post('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const { path, content, title } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  try {
    res.status(201).json(createDiagram(project, path, typeof content === 'string' ? content : '', title));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

diagramsRouter.put('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const { path, content } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  if (typeof content !== 'string') return res.status(400).json({ error: 'content is required.' });
  try {
    res.json(updateDiagram(project, path, content));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

diagramsRouter.delete('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(deleteDiagram(project, path));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
