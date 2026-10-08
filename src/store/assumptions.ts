import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Assumption, AssumptionStatus, Confidence } from '../types.js';
import { assumptionsDir, slugify } from './paths.js';

// Layout: assumptions/<YYYY-MM>/<id>.md, one file per assumption (YAML frontmatter + the context as the body),
// plus assumptions/INDEX.md — one line per assumption, newest first. Same scheme as thoughts.

const INDEX_FILE = 'INDEX.md';
const SUMMARY_LENGTH = 120;
const LIST_FIELDS = ['tags', 'items', 'wiki', 'refs', 'code'] as const;
const TEXT_FIELDS = ['alternatives', 'impact', 'question'] as const;

export interface AssumptionInput {
  title: string;
  body?: string;
  confidence?: Confidence;
  alternatives?: string;
  impact?: string;
  question?: string;
  tags?: string[];
  items?: string[];
  wiki?: string[];
  refs?: string[];
  code?: string[];
}

export interface AssumptionSearch {
  query?: string;
  confidence?: Confidence;
  status?: AssumptionStatus;
  tag?: string;
  item?: string;
  wiki?: string;
  since?: string;
  until?: string;
  limit?: number;
}

function idOf(timestamp: string): string {
  return timestamp.replace(/[^0-9A-Za-z-]+/g, '-').replace(/-+$/, '');
}

function monthOfId(id: string): string {
  return id.slice(0, 7);
}

function indexLine(a: Assumption): string {
  const rel = `${monthOfId(a.id)}/${a.id}.md`;
  const items = a.items?.length ? ` · items: ${a.items.join(', ')}` : '';
  const title = a.title.length > SUMMARY_LENGTH ? `${a.title.slice(0, SUMMARY_LENGTH - 1)}…` : a.title;
  const status = a.status === 'reviewed' ? ' · reviewed' : '';
  return `- ${a.created} · ${a.confidence}${status} · [${rel}](${rel})${items} · ${title}`;
}

function assumptionPath(project: string, id: string): string {
  if (!/^\d{4}-\d{2}-[0-9A-Za-z-]+$/.test(id)) throw new Error(`Invalid assumption id "${id}".`);
  return path.join(assumptionsDir(project), monthOfId(id), `${id}.md`);
}

function assumptionIds(project: string): string[] {
  const root = assumptionsDir(project);
  if (!fs.existsSync(root)) return [];
  const months = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();
  const ids: string[] = [];
  for (const month of months) {
    const names = fs
      .readdirSync(path.join(root, month))
      .filter((n) => n.endsWith('.md'))
      .sort()
      .reverse();
    for (const name of names) ids.push(name.slice(0, -'.md'.length));
  }
  return ids;
}

function readAssumptionFile(project: string, id: string): Assumption {
  const { data, content } = matter(fs.readFileSync(assumptionPath(project, id), 'utf8'));
  const a: Assumption = {
    id,
    project: slugify(project),
    title: String(data.title ?? ''),
    confidence: (data.confidence as Confidence) ?? 'medium',
    status: data.status === 'reviewed' ? 'reviewed' : 'open',
    created: String(data.created ?? ''),
  };
  if (data.reviewNote) a.reviewNote = String(data.reviewNote);
  if (data.reviewedAt) a.reviewedAt = String(data.reviewedAt);
  if (content.trim()) a.body = content.trim();
  for (const f of TEXT_FIELDS) if (data[f]) a[f] = String(data[f]);
  for (const f of LIST_FIELDS) if (Array.isArray(data[f]) && data[f].length) a[f] = data[f].map(String);
  if (data.updated) a.updated = String(data.updated);
  return a;
}

function writeAssumptionFile(project: string, a: Assumption): void {
  const file = assumptionPath(project, a.id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data: Record<string, unknown> = { id: a.id, created: a.created, title: a.title, confidence: a.confidence, status: a.status };
  if (a.reviewNote) data.reviewNote = a.reviewNote;
  if (a.reviewedAt) data.reviewedAt = a.reviewedAt;
  if (a.updated) data.updated = a.updated;
  for (const f of TEXT_FIELDS) if (a[f]) data[f] = a[f];
  for (const f of LIST_FIELDS) if (a[f]?.length) data[f] = a[f];
  fs.writeFileSync(file, matter.stringify(a.body ?? '', data), 'utf8');
}

/** Regenerates INDEX.md from the assumption files on disk. */
export function rebuildAssumptionIndex(project: string): number {
  const lines = assumptionIds(project).map((id) => indexLine(readAssumptionFile(project, id)));
  fs.mkdirSync(assumptionsDir(project), { recursive: true });
  fs.writeFileSync(
    path.join(assumptionsDir(project), INDEX_FILE),
    `# ${slugify(project)} — Assumptions\n\n${lines.join('\n')}${lines.length ? '\n' : ''}`,
    'utf8'
  );
  return lines.length;
}

function prependIndexLine(project: string, line: string): void {
  const file = path.join(assumptionsDir(project), INDEX_FILE);
  if (!fs.existsSync(file)) {
    rebuildAssumptionIndex(project);
    return;
  }
  const raw = fs.readFileSync(file, 'utf8');
  const idx = raw.indexOf('\n- ');
  const header = (idx === -1 ? raw : raw.slice(0, idx)).replace(/\n+$/, '');
  const rest = idx === -1 ? '' : raw.slice(idx + 1);
  fs.writeFileSync(file, `${header}\n\n${line}\n${rest}`, 'utf8');
}

function cleanList(list: string[] | undefined, strip?: RegExp): string[] | undefined {
  const cleaned = list?.map((v) => (strip ? v.replace(strip, '') : v).trim()).filter(Boolean);
  return cleaned && cleaned.length ? [...new Set(cleaned)] : undefined;
}

/** Applies the cleaned input fields onto `a`, leaving fields that are `undefined` in `input` alone. */
function applyInput(a: Assumption, input: Partial<AssumptionInput>): void {
  if (input.title !== undefined) a.title = input.title.trim();
  if (input.body !== undefined) a.body = input.body.trim() || undefined;
  if (input.confidence) a.confidence = input.confidence;
  for (const f of TEXT_FIELDS) if (input[f] !== undefined) a[f] = input[f]!.trim() || undefined;
  for (const f of LIST_FIELDS) {
    if (input[f] === undefined) continue;
    a[f] = cleanList(input[f], f === 'tags' || f === 'items' ? /^#/ : undefined);
  }
  if (!a.title) throw new Error('An assumption needs a title.');
}

export function addAssumption(project: string, input: AssumptionInput): Assumption {
  const created = new Date().toISOString();
  let id = idOf(created);
  for (let n = 2; fs.existsSync(assumptionPath(project, id)); n++) id = `${idOf(created)}-${n}`;
  const a: Assumption = { id, project: slugify(project), title: '', confidence: 'medium', status: 'open', created };
  applyInput(a, input);
  writeAssumptionFile(project, a);
  prependIndexLine(project, indexLine(a));
  return a;
}

/** Accepts the id as returned by the tools, or the raw ISO creation timestamp. */
function resolveId(id: string): string {
  return /T.*:/.test(id) ? idOf(id) : id;
}

export function getAssumption(project: string, id: string): Assumption {
  const resolved = resolveId(id);
  if (!fs.existsSync(assumptionPath(project, resolved))) throw new Error(`Assumption "${id}" not found.`);
  return readAssumptionFile(project, resolved);
}

/** Partial update: only the fields passed change; lists are replaced whole; an empty value clears a field. */
export function updateAssumption(project: string, id: string, changes: Partial<AssumptionInput>): Assumption {
  const a = getAssumption(project, id);
  applyInput(a, changes);
  a.updated = new Date().toISOString();
  writeAssumptionFile(project, a);
  rebuildAssumptionIndex(project);
  return a;
}

/** Marks an assumption reviewed (optionally with the outcome), or puts it back to open with `reopen`. */
export function reviewAssumption(
  project: string,
  id: string,
  { note, reopen }: { note?: string; reopen?: boolean } = {}
): Assumption {
  const a = getAssumption(project, id);
  const now = new Date().toISOString();
  if (reopen) {
    a.status = 'open';
    delete a.reviewedAt;
    delete a.reviewNote;
  } else {
    a.status = 'reviewed';
    a.reviewedAt = now;
    const trimmed = note?.trim();
    if (trimmed) a.reviewNote = trimmed;
    else delete a.reviewNote;
  }
  a.updated = now;
  writeAssumptionFile(project, a);
  rebuildAssumptionIndex(project);
  return a;
}

export function deleteAssumption(project: string, id: string): Assumption {
  const existing = getAssumption(project, id);
  fs.unlinkSync(assumptionPath(project, existing.id));
  rebuildAssumptionIndex(project);
  return existing;
}

/** Newest-first listing/search. Dates are prefix-compared on the creation time, so "2026-09" or "2026-09-28" both work. */
export function listAssumptions(
  project: string,
  { query, confidence, status, tag, item, wiki, since, until, limit = 20 }: AssumptionSearch
): Assumption[] {
  const q = query?.toLowerCase();
  const wantedTag = tag?.replace(/^#/, '').toLowerCase();
  const wantedItem = item?.replace(/^#/, '');
  const results: Assumption[] = [];
  for (const id of assumptionIds(project)) {
    if (results.length >= limit) break;
    const a = readAssumptionFile(project, id);
    if (confidence && a.confidence !== confidence) continue;
    if (status && a.status !== status) continue;
    if (since && a.created.slice(0, since.length) < since) continue;
    if (until && a.created.slice(0, until.length) > until) continue;
    if (wantedItem && !a.items?.includes(wantedItem)) continue;
    if (wiki && !a.wiki?.includes(wiki)) continue;
    if (wantedTag && !a.tags?.some((x) => x.toLowerCase() === wantedTag)) continue;
    if (q && !`${a.title}\n${a.body ?? ''}\n${a.impact ?? ''}\n${a.question ?? ''}`.toLowerCase().includes(q)) continue;
    results.push(a);
  }
  return results;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** Unreviewed assumptions, lowest confidence first, newest first within a level. */
export function listAssumptionsForReview(project: string, limit = 1000): Assumption[] {
  return listAssumptions(project, { status: 'open', limit: 1000 })
    .sort((x, y) => CONFIDENCE_RANK[x.confidence] - CONFIDENCE_RANK[y.confidence])
    .slice(0, limit);
}
