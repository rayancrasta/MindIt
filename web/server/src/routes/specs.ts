import { Router } from 'express';
import {
  buildSpecJourneyDiagram,
  createSpecScreen,
  deleteSpecScreen,
  deleteSpecTransition,
  getSpecTree,
  linkSpecScreens,
  listSpecFolder,
  listSpecScreensRecursive,
  readSpecScreen,
  setSpecTransition,
  unlinkSpecScreens,
  updateSpecScreen,
} from '../../../../src/store/specs.js';
import { findItemsReferencingSpec } from '../../../../src/store/items.js';
import type { SpecPlatform } from '../../../../src/types.js';

export const specsRouter = Router({ mergeParams: true });

function pathParam(req: { query: Record<string, unknown> }): string {
  const p = req.query.path;
  return typeof p === 'string' ? p : '';
}

function platformParam(req: { params: Record<string, unknown> }): SpecPlatform | null {
  const p = req.params.platform;
  return p === 'web' || p === 'mobile' ? p : null;
}

specsRouter.use((req, res, next) => {
  if (!platformParam(req)) return res.status(400).json({ error: 'platform must be "web" or "mobile".' });
  next();
});

specsRouter.get('/tree', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  try {
    if (req.query.recursive === 'true') {
      res.json(getSpecTree(project, platform, folder));
    } else {
      res.json(listSpecFolder(project, platform, folder));
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.get('/journey', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  try {
    const screens = listSpecScreensRecursive(project, platform, folder);
    res.json({ mermaid: buildSpecJourneyDiagram(screens) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.get('/screens', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  try {
    res.json(listSpecScreensRecursive(project, platform, folder));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.get('/screen', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(readSpecScreen(project, platform, path));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.get('/screen/references', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(findItemsReferencingSpec(project, platform, path));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.post('/screen', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const { path, ...input } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  try {
    res.status(201).json(createSpecScreen(project, platform, path, input));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.put('/screen', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const { path, ...input } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(updateSpecScreen(project, platform, path, input));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.delete('/screen', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(deleteSpecScreen(project, platform, path));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.put('/screen/transition', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const { path, direction, transition } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  if (direction !== 'entry' && direction !== 'exit') return res.status(400).json({ error: 'direction must be "entry" or "exit".' });
  if (!transition || typeof transition !== 'object') return res.status(400).json({ error: 'transition is required.' });
  try {
    res.json(setSpecTransition(project, platform, path, direction, transition));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.delete('/screen/transition', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const path = pathParam(req);
  const direction = req.query.direction;
  const label = req.query.label;
  if (!path) return res.status(400).json({ error: 'path is required.' });
  if (direction !== 'entry' && direction !== 'exit') return res.status(400).json({ error: 'direction must be "entry" or "exit".' });
  if (!label || typeof label !== 'string') return res.status(400).json({ error: 'label is required.' });
  try {
    res.json(deleteSpecTransition(project, platform, path, direction, label));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.post('/screen/link', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const { from, to, label, backLabel } = req.body ?? {};
  if (!from || typeof from !== 'string') return res.status(400).json({ error: 'from is required.' });
  if (!to || typeof to !== 'string') return res.status(400).json({ error: 'to is required.' });
  if (!label || typeof label !== 'string') return res.status(400).json({ error: 'label is required.' });
  try {
    res.json(linkSpecScreens(project, platform, { from, to, label, backLabel }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

specsRouter.delete('/screen/link', (req, res) => {
  const { project } = req.params as { project: string };
  const platform = platformParam(req) as SpecPlatform;
  const from = req.query.from;
  const to = req.query.to;
  const label = req.query.label;
  const backLabel = typeof req.query.backLabel === 'string' ? req.query.backLabel : undefined;
  if (!from || typeof from !== 'string') return res.status(400).json({ error: 'from is required.' });
  if (!to || typeof to !== 'string') return res.status(400).json({ error: 'to is required.' });
  if (!label || typeof label !== 'string') return res.status(400).json({ error: 'label is required.' });
  try {
    res.json(unlinkSpecScreens(project, platform, { from, to, label, backLabel }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
