import { Router } from 'express';
import { THOUGHT_KINDS } from '../../../../src/types.js';
import type { ThoughtKind } from '../../../../src/types.js';
import { resolveItemRefs } from '../../../../src/store/items.js';
import { addThought, deleteThought, getThought, listThoughts, updateThought } from '../../../../src/store/thoughts.js';

export const thoughtsRouter = Router({ mergeParams: true });

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const kindOf = (v: unknown): ThoughtKind | undefined =>
  typeof v === 'string' && (THOUGHT_KINDS as readonly string[]).includes(v) ? (v as ThoughtKind) : undefined;
const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

function withRefs<T extends { items?: string[] }>(t: T) {
  return { ...t, touchedItems: resolveItemRefs(t.items) };
}

thoughtsRouter.get('/', (req, res) => {
  const { project } = req.params as { project: string };
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
  const thoughts = listThoughts(project, {
    query: str(req.query.q),
    kind: kindOf(req.query.kind),
    tag: str(req.query.tag),
    item: str(req.query.item),
    since: str(req.query.since),
    until: str(req.query.until),
    limit,
  });
  res.json(thoughts.map(withRefs));
});

thoughtsRouter.get('/:id', (req, res) => {
  const { project, id } = req.params as { project: string; id: string };
  try {
    res.json(withRefs(getThought(project, id)));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

thoughtsRouter.post('/', (req, res) => {
  const { project } = req.params as { project: string };
  const { body, kind, title, tags, items } = req.body ?? {};
  if (!body || typeof body !== 'string') return res.status(400).json({ error: 'body is required.' });
  try {
    const t = addThought(project, { body, kind: kindOf(kind), title: str(title), tags: strings(tags), items: strings(items) });
    res.status(201).json(withRefs(t));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

thoughtsRouter.patch('/:id', (req, res) => {
  const { project, id } = req.params as { project: string; id: string };
  const { body, kind, title, tags, items } = req.body ?? {};
  try {
    const t = updateThought(project, id, {
      body: typeof body === 'string' ? body : undefined,
      kind: kindOf(kind),
      title: typeof title === 'string' ? title : undefined,
      tags: strings(tags),
      items: strings(items),
    });
    res.json(withRefs(t));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(/not found/.test(message) ? 404 : 400).json({ error: message });
  }
});

thoughtsRouter.delete('/:id', (req, res) => {
  const { project, id } = req.params as { project: string; id: string };
  try {
    deleteThought(project, id);
    res.json({ message: 'Thought deleted.' });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
