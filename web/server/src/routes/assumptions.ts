import { Router } from 'express';
import { ASSUMPTION_STATUSES, CONFIDENCE_LEVELS } from '../../../../src/types.js';
import type { AssumptionStatus, Confidence } from '../../../../src/types.js';
import { resolveItemRefs } from '../../../../src/store/items.js';
import {
  addAssumption,
  deleteAssumption,
  getAssumption,
  listAssumptions,
  reviewAssumption,
  updateAssumption,
} from '../../../../src/store/assumptions.js';

export const assumptionsRouter = Router({ mergeParams: true });

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const text = (v: unknown) => (typeof v === 'string' ? v : undefined);
const confidenceOf = (v: unknown): Confidence | undefined =>
  typeof v === 'string' && (CONFIDENCE_LEVELS as readonly string[]).includes(v) ? (v as Confidence) : undefined;
const statusOf = (v: unknown): AssumptionStatus | undefined =>
  typeof v === 'string' && (ASSUMPTION_STATUSES as readonly string[]).includes(v) ? (v as AssumptionStatus) : undefined;
const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

function withRefs<T extends { items?: string[] }>(a: T) {
  return { ...a, touchedItems: resolveItemRefs(a.items) };
}

/** Picks the editable fields out of a request body; wrong-typed values become undefined (= unchanged). */
function fieldsOf(b: Record<string, unknown>) {
  return {
    title: text(b.title),
    body: text(b.body),
    confidence: confidenceOf(b.confidence),
    alternatives: text(b.alternatives),
    impact: text(b.impact),
    question: text(b.question),
    tags: strings(b.tags),
    items: strings(b.items),
    wiki: strings(b.wiki),
    refs: strings(b.refs),
    code: strings(b.code),
  };
}

assumptionsRouter.get('/', (req, res) => {
  const { project } = req.params as { project: string };
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
  const found = listAssumptions(project, {
    query: str(req.query.q),
    confidence: confidenceOf(req.query.confidence),
    status: statusOf(req.query.status),
    tag: str(req.query.tag),
    item: str(req.query.item),
    wiki: str(req.query.wiki),
    since: str(req.query.since),
    until: str(req.query.until),
    limit,
  });
  res.json(found.map(withRefs));
});

assumptionsRouter.get('/:id', (req, res) => {
  const { project, id } = req.params as { project: string; id: string };
  try {
    res.json(withRefs(getAssumption(project, id)));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

assumptionsRouter.post('/', (req, res) => {
  const { project } = req.params as { project: string };
  const fields = fieldsOf(req.body ?? {});
  if (!fields.title) return res.status(400).json({ error: 'title is required.' });
  try {
    res.status(201).json(withRefs(addAssumption(project, { ...fields, title: fields.title })));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

assumptionsRouter.patch('/:id', (req, res) => {
  const { project, id } = req.params as { project: string; id: string };
  try {
    res.json(withRefs(updateAssumption(project, id, fieldsOf(req.body ?? {}))));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(/not found/.test(message) ? 404 : 400).json({ error: message });
  }
});

// Review is its own endpoint rather than a PATCH field so it stamps reviewedAt server-side.
assumptionsRouter.post('/:id/review', (req, res) => {
  const { project, id } = req.params as { project: string; id: string };
  const { note, reopen } = req.body ?? {};
  try {
    res.json(withRefs(reviewAssumption(project, id, { note: text(note), reopen: reopen === true })));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(/not found/.test(message) ? 404 : 400).json({ error: message });
  }
});

assumptionsRouter.delete('/:id', (req, res) => {
  const { project, id } = req.params as { project: string; id: string };
  try {
    deleteAssumption(project, id);
    res.json({ message: 'Assumption deleted.' });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
