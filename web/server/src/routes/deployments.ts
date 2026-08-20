import { Router } from 'express';
import {
  addDeploymentNote,
  deleteDeploymentNote,
  findDeploymentNote,
  listDeploymentNotes,
  updateDeploymentNote,
} from '../../../../src/store/deployments.js';
import type { DeploymentStatus } from '../../../../src/types.js';

export const deploymentsRouter = Router();

function projectParam(req: { query: Record<string, unknown> }): string | undefined {
  const p = req.query.project;
  return typeof p === 'string' ? p : undefined;
}

deploymentsRouter.get('/', (req, res) => {
  const project = projectParam(req);
  const environment = typeof req.query.environment === 'string' ? req.query.environment : undefined;
  const status = typeof req.query.status === 'string' ? (req.query.status as DeploymentStatus) : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  res.json(listDeploymentNotes(project, { environment, status }, limit));
});

deploymentsRouter.post('/', (req, res) => {
  const { project, commitHash, environment, status, deployedBy, timestamp, notes } = req.body ?? {};
  if (!project || !commitHash) {
    return res.status(400).json({ error: 'project and commitHash are required.' });
  }
  try {
    res.status(201).json(addDeploymentNote(project, commitHash, { environment, status, deployedBy, timestamp, notes }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

deploymentsRouter.get('/:id', (req, res) => {
  const project = projectParam(req);
  if (!project) return res.status(400).json({ error: 'project is required.' });
  const note = findDeploymentNote(project, req.params.id);
  if (!note) return res.status(404).json({ error: `No deployment note found with number ${req.params.id}.` });
  res.json(note);
});

deploymentsRouter.patch('/:id', (req, res) => {
  const project = projectParam(req);
  if (!project) return res.status(400).json({ error: 'project is required.' });
  try {
    res.json(updateDeploymentNote(project, req.params.id, req.body ?? {}));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

deploymentsRouter.delete('/:id', (req, res) => {
  const project = projectParam(req);
  if (!project) return res.status(400).json({ error: 'project is required.' });
  res.json({ message: deleteDeploymentNote(project, req.params.id) });
});
