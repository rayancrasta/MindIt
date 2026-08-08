import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';
import { ITEM_TYPES, type Comment, type Item, type ItemStatus, type ItemType } from '../types.js';
import { itemDir, listProjectSlugs, slugify } from './paths.js';
import { nextId } from './counter.js';

const ID_WIDTH = 5;

function normalizeDate(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

function normalizeComment(c: Record<string, unknown>): Comment {
  const comment: Comment = {
    id: String(c.id),
    author: String(c.author ?? 'Unknown'),
    text: String(c.text ?? ''),
    created: normalizeDate(c.created),
  };
  if (c.updated !== undefined) comment.updated = normalizeDate(c.updated);
  return comment;
}

function parseItemFile(raw: string): Item {
  const { data, content } = matter(raw);
  const notes = content.trim() ? content.trim() : undefined;
  const comments = Array.isArray(data.comments) ? data.comments.map(normalizeComment) : undefined;
  return {
    ...data,
    id: String(data.id),
    created: normalizeDate(data.created),
    updated: normalizeDate(data.updated),
    notes,
    ...(comments ? { comments } : {}),
  } as Item;
}

function filePath(type: ItemType, project: string, id: string): string {
  return path.join(itemDir(type, project), `${id.padStart(ID_WIDTH, '0')}.md`);
}

/** Normalizes a user-supplied match like "42", "042", or "#42" down to its bare id form ("42"). */
function normalizeIdMatch(match: string): string | null {
  const m = match.trim().match(/^#?(\d+)$/);
  return m ? String(Number(m[1])) : null;
}

export function createItem<T extends Item>(
  type: ItemType,
  project: string,
  title: string,
  extra: Record<string, unknown> = {},
  notes?: string
): T {
  const id = nextId();
  const now = new Date().toISOString();
  const data: Record<string, unknown> = {
    id,
    type,
    project: slugify(project),
    title,
    status: 'new' as ItemStatus,
    created: now,
    updated: now,
    ...extra,
  };
  const file = matter.stringify(notes ?? '', data);
  fs.writeFileSync(filePath(type, project, id), file, 'utf8');
  return parseItemFile(fs.readFileSync(filePath(type, project, id), 'utf8')) as T;
}

export function listItems<T extends Item>(
  type: ItemType,
  project?: string,
  status?: ItemStatus,
  limit?: number
): T[] {
  const projects = project ? [slugify(project)] : listProjectSlugs();
  const items: T[] = [];
  for (const p of projects) {
    const dir = itemDir(type, p);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const item = parseItemFile(fs.readFileSync(path.join(dir, f), 'utf8')) as T;
      if (!status || item.status === status) items.push(item);
    }
  }
  items.sort((a, b) => b.updated.localeCompare(a.updated));
  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

export function findItem<T extends Item>(type: ItemType, project: string, match: string): T | null {
  const all = listItems<T>(type, project);
  const idMatch = normalizeIdMatch(match);
  if (idMatch !== null) {
    const exact = all.find((t) => t.id === idMatch);
    if (exact) return exact;
  }
  const lower = match.toLowerCase();
  const candidates = all.filter((t) => t.title.toLowerCase().includes(lower));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.updated.localeCompare(a.updated));
  return candidates[0];
}

/** Finds an item by its number alone, regardless of type or project. */
export function findItemGlobal(match: string): { type: ItemType; project: string; item: Item } | null {
  const id = normalizeIdMatch(match);
  if (id === null) return null;
  for (const project of listProjectSlugs()) {
    for (const type of ITEM_TYPES) {
      const file = filePath(type, project, id);
      if (fs.existsSync(file)) {
        return { type, project, item: parseItemFile(fs.readFileSync(file, 'utf8')) };
      }
    }
  }
  return null;
}

export function updateItem<T extends Item>(
  type: ItemType,
  project: string,
  match: string,
  patch: Record<string, unknown>
): T {
  const found = findItem<T>(type, project, match);
  if (!found) {
    throw new Error(`No ${type} matching "${match}" in project "${slugify(project)}".`);
  }
  const file = filePath(type, project, found.id);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const { notes, ...rest } = patch;
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) data[key] = value;
  }
  data.updated = new Date().toISOString();
  const newContent = notes !== undefined ? String(notes) : content;
  fs.writeFileSync(file, matter.stringify(newContent, data), 'utf8');
  return parseItemFile(fs.readFileSync(file, 'utf8')) as T;
}

function loadFileByGlobalId(id: string): { file: string; type: ItemType } {
  const found = findItemGlobal(id);
  if (!found) {
    throw new Error(`No item found with number ${id}.`);
  }
  return { file: filePath(found.type, found.project, found.item.id), type: found.type };
}

export function addComment(id: string, text: string, author: string): Item {
  const { file } = loadFileByGlobalId(id);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const comments: Record<string, unknown>[] = Array.isArray(data.comments) ? data.comments : [];
  comments.push({ id: randomUUID().slice(0, 8), author, text, created: new Date().toISOString() });
  data.comments = comments;
  data.updated = new Date().toISOString();
  fs.writeFileSync(file, matter.stringify(content, data), 'utf8');
  return parseItemFile(fs.readFileSync(file, 'utf8'));
}

export function updateComment(id: string, commentId: string, text: string): Item {
  const { file } = loadFileByGlobalId(id);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const comments: Record<string, unknown>[] = Array.isArray(data.comments) ? data.comments : [];
  const idx = comments.findIndex((c) => String(c.id) === commentId);
  if (idx === -1) {
    throw new Error(`No comment ${commentId} found on item #${id}.`);
  }
  comments[idx] = { ...comments[idx], text, updated: new Date().toISOString() };
  data.comments = comments;
  data.updated = new Date().toISOString();
  fs.writeFileSync(file, matter.stringify(content, data), 'utf8');
  return parseItemFile(fs.readFileSync(file, 'utf8'));
}

export function deleteComment(id: string, commentId: string): Item {
  const { file } = loadFileByGlobalId(id);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const comments: Record<string, unknown>[] = Array.isArray(data.comments) ? data.comments : [];
  const next = comments.filter((c) => String(c.id) !== commentId);
  if (next.length === comments.length) {
    throw new Error(`No comment ${commentId} found on item #${id}.`);
  }
  data.comments = next;
  data.updated = new Date().toISOString();
  fs.writeFileSync(file, matter.stringify(content, data), 'utf8');
  return parseItemFile(fs.readFileSync(file, 'utf8'));
}

export function deleteItem<T extends Item>(type: ItemType, project: string, match: string): T {
  const found = findItem<T>(type, project, match);
  if (!found) {
    throw new Error(`No ${type} matching "${match}" in project "${slugify(project)}".`);
  }
  fs.unlinkSync(filePath(type, project, found.id));
  return found;
}

export function countChildren(
  childType: ItemType,
  project: string,
  parentField: string,
  parentId: string
): number {
  const dir = itemDir(childType, project);
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const { data } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (String(data[parentField]) === parentId) count++;
  }
  return count;
}
