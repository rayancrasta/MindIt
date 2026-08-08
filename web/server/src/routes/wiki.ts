import { Router } from 'express';
import {
  appendWikiPage,
  createWikiPage,
  deleteWikiPage,
  getWikiTree,
  listWikiFolder,
  readWikiPage,
  updateWikiPage,
} from '../../../../src/store/wiki.js';

export const wikiRouter = Router({ mergeParams: true });

function pathParam(req: { query: Record<string, unknown> }): string {
  const p = req.query.path;
  return typeof p === 'string' ? p : '';
}

wikiRouter.get('/tree', (req, res) => {
  const { project } = req.params as { project: string };
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  try {
    if (req.query.recursive === 'true') {
      res.json(getWikiTree(project, folder));
    } else {
      res.json(listWikiFolder(project, folder));
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

wikiRouter.get('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(readWikiPage(project, path));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

wikiRouter.post('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const { path, content, title } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  try {
    res.status(201).json(createWikiPage(project, path, typeof content === 'string' ? content : '', title));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

wikiRouter.put('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const { path, content } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  if (typeof content !== 'string') return res.status(400).json({ error: 'content is required.' });
  try {
    res.json(updateWikiPage(project, path, content));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

wikiRouter.patch('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const { path, content } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'content is required.' });
  try {
    res.json(appendWikiPage(project, path, content));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

wikiRouter.delete('/page', (req, res) => {
  const { project } = req.params as { project: string };
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(deleteWikiPage(project, path));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
