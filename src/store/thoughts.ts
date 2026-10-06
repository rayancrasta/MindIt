import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { DeveloperThought, ThoughtKind } from '../types.js';
import { slugify, thoughtsDir } from './paths.js';

// Layout: thoughts/<YYYY-MM>/<id>.md, one file per thought (YAML frontmatter + the thought as the body),
// plus thoughts/INDEX.md — one line per thought, newest first. The id is the creation timestamp with
// non-filename characters replaced, so ids sort chronologically.

const INDEX_FILE = 'INDEX.md';
const SUMMARY_LENGTH = 120;

export interface ThoughtSearch {
  query?: string;
  kind?: ThoughtKind;
  tag?: string;
  item?: string;
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

function summaryOf(t: DeveloperThought): string {
  const text = t.title?.trim() || t.body.split('\n')[0].trim();
  return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH - 1)}…` : text;
}

function indexLine(t: DeveloperThought): string {
  const rel = `${monthOfId(t.id)}/${t.id}.md`;
  const tags = t.tags && t.tags.length ? ` · tags: ${t.tags.join(', ')}` : '';
  const items = t.items && t.items.length ? ` · items: ${t.items.join(', ')}` : '';
  return `- ${t.created} · ${t.kind} · [${rel}](${rel})${tags}${items} · ${summaryOf(t)}`;
}

function thoughtPath(project: string, id: string): string {
  if (!/^\d{4}-\d{2}-[0-9A-Za-z-]+$/.test(id)) throw new Error(`Invalid thought id "${id}".`);
  return path.join(thoughtsDir(project), monthOfId(id), `${id}.md`);
}

function thoughtIds(project: string): string[] {
  const root = thoughtsDir(project);
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

function readThoughtFile(project: string, id: string): DeveloperThought {
  const { data, content } = matter(fs.readFileSync(thoughtPath(project, id), 'utf8'));
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : undefined;
  const items = Array.isArray(data.items) ? data.items.map(String) : undefined;
  return {
    id,
    project: slugify(project),
    kind: (data.kind as ThoughtKind) ?? 'thought',
    ...(data.title ? { title: String(data.title) } : {}),
    body: content.trim(),
    ...(tags && tags.length ? { tags } : {}),
    ...(items && items.length ? { items } : {}),
    created: String(data.created ?? ''),
    ...(data.updated ? { updated: String(data.updated) } : {}),
  };
}

function writeThoughtFile(project: string, t: DeveloperThought): void {
  const file = thoughtPath(project, t.id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data: Record<string, unknown> = { id: t.id, created: t.created, kind: t.kind };
  if (t.updated) data.updated = t.updated;
  if (t.title) data.title = t.title;
  if (t.tags && t.tags.length) data.tags = t.tags;
  if (t.items && t.items.length) data.items = t.items;
  fs.writeFileSync(file, matter.stringify(t.body, data), 'utf8');
}

/** Regenerates INDEX.md from the thought files on disk. */
export function rebuildThoughtIndex(project: string): number {
  const lines = thoughtIds(project).map((id) => indexLine(readThoughtFile(project, id)));
  fs.mkdirSync(thoughtsDir(project), { recursive: true });
  fs.writeFileSync(
    path.join(thoughtsDir(project), INDEX_FILE),
    `# ${slugify(project)} — Developer Thoughts\n\n${lines.join('\n')}${lines.length ? '\n' : ''}`,
    'utf8'
  );
  return lines.length;
}

function prependIndexLine(project: string, line: string): void {
  const file = path.join(thoughtsDir(project), INDEX_FILE);
  if (!fs.existsSync(file)) {
    rebuildThoughtIndex(project);
    return;
  }
  const raw = fs.readFileSync(file, 'utf8');
  const idx = raw.indexOf('\n- ');
  const header = (idx === -1 ? raw : raw.slice(0, idx)).replace(/\n+$/, '');
  const rest = idx === -1 ? '' : raw.slice(idx + 1);
  fs.writeFileSync(file, `${header}\n\n${line}\n${rest}`, 'utf8');
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  const cleaned = tags?.map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
  return cleaned && cleaned.length ? [...new Set(cleaned)] : undefined;
}

export function addThought(
  project: string,
  input: { body: string; kind?: ThoughtKind; title?: string; tags?: string[]; items?: string[] }
): DeveloperThought {
  const body = input.body.trim();
  if (!body) throw new Error('A thought needs some text.');
  const created = new Date().toISOString();
  let id = idOf(created);
  for (let n = 2; fs.existsSync(thoughtPath(project, id)); n++) id = `${idOf(created)}-${n}`;
  const items = input.items?.map((i) => i.replace(/^#/, '').trim()).filter(Boolean);
  const thought: DeveloperThought = {
    id,
    project: slugify(project),
    kind: input.kind ?? 'thought',
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
    body,
    ...(normalizeTags(input.tags) ? { tags: normalizeTags(input.tags) } : {}),
    ...(items && items.length ? { items } : {}),
    created,
  };
  writeThoughtFile(project, thought);
  prependIndexLine(project, indexLine(thought));
  return thought;
}

/** Accepts the id as returned by the tools, or the raw ISO creation timestamp. */
function resolveId(id: string): string {
  return /T.*:/.test(id) ? idOf(id) : id;
}

export function getThought(project: string, id: string): DeveloperThought {
  const resolved = resolveId(id);
  if (!fs.existsSync(thoughtPath(project, resolved))) throw new Error(`Thought "${id}" not found.`);
  return readThoughtFile(project, resolved);
}

/** Partial update: only the fields passed change. An empty string/array clears title/tags/items. */
export function updateThought(
  project: string,
  id: string,
  changes: { body?: string; kind?: ThoughtKind; title?: string; tags?: string[]; items?: string[] }
): DeveloperThought {
  const existing = getThought(project, id);
  const { title: _t, tags: _g, items: _i, ...rest } = existing;
  const body = changes.body === undefined ? existing.body : changes.body.trim();
  if (!body) throw new Error('A thought needs some text.');
  const title = changes.title === undefined ? existing.title : changes.title.trim() || undefined;
  const tags = changes.tags === undefined ? existing.tags : normalizeTags(changes.tags);
  const itemList =
    changes.items === undefined ? existing.items : changes.items.map((i) => i.replace(/^#/, '').trim()).filter(Boolean);
  const updated: DeveloperThought = {
    ...rest,
    kind: changes.kind ?? existing.kind,
    body,
    ...(title ? { title } : {}),
    ...(tags && tags.length ? { tags } : {}),
    ...(itemList && itemList.length ? { items: itemList } : {}),
    updated: new Date().toISOString(),
  };
  writeThoughtFile(project, updated);
  rebuildThoughtIndex(project);
  return updated;
}

export function deleteThought(project: string, id: string): DeveloperThought {
  const existing = getThought(project, id);
  fs.unlinkSync(thoughtPath(project, existing.id));
  rebuildThoughtIndex(project);
  return existing;
}

/** Newest-first listing/search. Dates are prefix-compared on the creation time, so "2026-09" or "2026-09-28" both work. */
export function listThoughts(
  project: string,
  { query, kind, tag, item, since, until, limit = 20 }: ThoughtSearch
): DeveloperThought[] {
  const q = query?.toLowerCase();
  const wantedTag = tag?.replace(/^#/, '').toLowerCase();
  const wantedItem = item?.replace(/^#/, '');
  const results: DeveloperThought[] = [];
  for (const id of thoughtIds(project)) {
    if (results.length >= limit) break;
    const t = readThoughtFile(project, id);
    if (kind && t.kind !== kind) continue;
    if (since && t.created.slice(0, since.length) < since) continue;
    if (until && t.created.slice(0, until.length) > until) continue;
    if (wantedItem && !t.items?.includes(wantedItem)) continue;
    if (wantedTag && !t.tags?.some((x) => x.toLowerCase() === wantedTag)) continue;
    if (q && !`${t.title ?? ''}\n${t.body}`.toLowerCase().includes(q)) continue;
    results.push(t);
  }
  return results;
}
