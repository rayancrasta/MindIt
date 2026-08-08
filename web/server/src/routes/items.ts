import { Router } from 'express';
import { addComment, deleteComment, findItemGlobal, updateComment } from '../../../../src/store/items.js';
import { updateByType, deleteByType, type GenericPatch } from '../dispatch.js';

export const itemsRouter = Router();

itemsRouter.get('/:id', (req, res) => {
  const found = findItemGlobal(req.params.id);
  if (!found) return res.status(404).json({ error: `No item found with number ${req.params.id}.` });
  res.json(found);
});

itemsRouter.patch('/:id', (req, res) => {
  const found = findItemGlobal(req.params.id);
  if (!found) return res.status(404).json({ error: `No item found with number ${req.params.id}.` });
  try {
    const patch = (req.body ?? {}) as GenericPatch;
    const item = updateByType(found.type, found.project, found.item.id, patch);
    res.json({ type: found.type, project: found.project, item });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

itemsRouter.post('/:id/comments', (req, res) => {
  const { text, author } = req.body ?? {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required.' });
  }
  try {
    const item = addComment(req.params.id, text, (typeof author === 'string' && author.trim()) || 'You');
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

itemsRouter.patch('/:id/comments/:commentId', (req, res) => {
  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required.' });
  }
  try {
    const item = updateComment(req.params.id, req.params.commentId, text);
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

itemsRouter.delete('/:id/comments/:commentId', (req, res) => {
  try {
    const item = deleteComment(req.params.id, req.params.commentId);
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

itemsRouter.delete('/:id', (req, res) => {
  const found = findItemGlobal(req.params.id);
  if (!found) return res.status(404).json({ error: `No item found with number ${req.params.id}.` });
  const force = req.query.force === 'true';
  try {
    const message = deleteByType(found.type, found.project, found.item.id, force);
    if (message.startsWith('Deleted')) {
      res.json({ message });
    } else {
      res.status(409).json({ message });
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
