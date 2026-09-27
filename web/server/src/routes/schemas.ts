import { Router } from 'express';
import {
  buildErDiagram,
  createSchemaTable,
  deleteSchemaTable,
  getSchemaTree,
  listSchemaFolder,
  listSchemaTablesRecursive,
  readSchemaTable,
  updateSchemaTable,
} from '../../../../src/store/schemas.js';

export const schemasRouter = Router({ mergeParams: true });

function pathParam(req: { query: Record<string, unknown> }): string {
  const p = req.query.path;
  return typeof p === 'string' ? p : '';
}

schemasRouter.get('/tree', (req, res) => {
  const { project } = req.params as { project: string };
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  try {
    if (req.query.recursive === 'true') {
      res.json(getSchemaTree(project, folder));
    } else {
      res.json(listSchemaFolder(project, folder));
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

schemasRouter.get('/erd', (req, res) => {
  const { project } = req.params as { project: string };
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  try {
    const tables = listSchemaTablesRecursive(project, folder);
    res.json({ mermaid: buildErDiagram(tables) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

schemasRouter.get('/table', (req, res) => {
  const { project } = req.params as { project: string };
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(readSchemaTable(project, path));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

schemasRouter.post('/table', (req, res) => {
  const { project } = req.params as { project: string };
  const { path, columns, description, title } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  try {
    res
      .status(201)
      .json(
        createSchemaTable(
          project,
          path,
          Array.isArray(columns) ? columns : [],
          typeof description === 'string' ? description : '',
          title
        )
      );
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

schemasRouter.put('/table', (req, res) => {
  const { project } = req.params as { project: string };
  const { path, columns, description } = req.body ?? {};
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required.' });
  if (!Array.isArray(columns)) return res.status(400).json({ error: 'columns is required.' });
  try {
    res.json(updateSchemaTable(project, path, columns, typeof description === 'string' ? description : ''));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

schemasRouter.delete('/table', (req, res) => {
  const { project } = req.params as { project: string };
  const path = pathParam(req);
  if (!path) return res.status(400).json({ error: 'path is required.' });
  try {
    res.json(deleteSchemaTable(project, path));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
