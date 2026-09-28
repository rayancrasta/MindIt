import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { WikiPage, WikiTreeNode } from '../types.js';
import { wikiDir } from './paths.js';

const UNSAFE_CHARS = /[<>:"|?*\x00-\x1f]/g;

function sanitizeSegment(segment: string): string {
  return segment.trim().replace(UNSAFE_CHARS, '').replace(/\\/g, '');
}

function splitPath(wikiPath: string): string[] {
  const segments = wikiPath
    .split('/')
    .map((s) => sanitizeSegment(s))
    .filter((s) => s.length > 0);
  for (const s of segments) {
    if (s === '.' || s === '..') {
      throw new Error(`Invalid wiki path segment "${s}".`);
    }
  }
  if (segments.length === 0) {
    throw new Error('Wiki path cannot be empty.');
  }
  return segments;
}

/** Resolves a user-supplied wiki path to an absolute .md file path, guaranteed to stay within the project's wiki root. */
function resolveWikiFile(project: string, wikiPath: string): { absPath: string; relPath: string } {
  const root = wikiDir(project);
  const segments = splitPath(wikiPath);
  const last = segments[segments.length - 1];
  segments[segments.length - 1] = last.endsWith('.md') ? last : `${last}.md`;
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Wiki path "${wikiPath}" escapes the wiki root.`);
  }
  const relPath = segments.join('/').replace(/\.md$/, '');
  return { absPath, relPath };
}

/** Resolves a user-supplied folder path (possibly empty, meaning the wiki root) within the project's wiki root. */
function resolveWikiFolder(project: string, folderPath?: string): { absPath: string; relPath: string } {
  const root = wikiDir(project);
  if (!folderPath || !folderPath.trim()) return { absPath: root, relPath: '' };
  const segments = splitPath(folderPath);
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Wiki folder "${folderPath}" escapes the wiki root.`);
  }
  return { absPath, relPath: segments.join('/') };
}

function titleFromPath(relPath: string): string {
  const name = relPath.split('/').pop() ?? relPath;
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function normalizeDate(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v ?? '');
}

function parseWikiFile(raw: string, relPath: string): WikiPage {
  const { data, content } = matter(raw);
  return {
    path: relPath,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(relPath),
    content: content.trim(),
    created: normalizeDate(data.created),
    updated: normalizeDate(data.updated),
  };
}

export function createWikiPage(project: string, wikiPath: string, content = '', title?: string): WikiPage {
  const { absPath, relPath } = resolveWikiFile(project, wikiPath);
  if (fs.existsSync(absPath)) {
    throw new Error(
      `Wiki page "${relPath}" already exists in project "${project}". Use update_wiki_page or append_wiki_page instead.`
    );
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const now = new Date().toISOString();
  const data = { title: title?.trim() || titleFromPath(relPath), created: now, updated: now };
  fs.writeFileSync(absPath, matter.stringify(content, data), 'utf8');
  return parseWikiFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function updateWikiPage(project: string, wikiPath: string, content: string): WikiPage {
  const { absPath, relPath } = resolveWikiFile(project, wikiPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No wiki page "${relPath}" in project "${project}".`);
  }
  const { data } = matter(fs.readFileSync(absPath, 'utf8'));
  // gray-matter caches parsed frontmatter keyed by the raw file content, and hands back a
  // reference to the cached object — mutating `data` in place corrupts that cache entry, so any
  // later file whose raw content happens to match would get this stale data back. Build a new
  // object instead of writing through the returned one.
  const nextData = { ...data, updated: new Date().toISOString() };
  fs.writeFileSync(absPath, matter.stringify(content, nextData), 'utf8');
  return parseWikiFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

/** Appends markdown to an existing page, creating it (with this content as its body) if it doesn't exist yet. */
export function appendWikiPage(project: string, wikiPath: string, content: string): WikiPage {
  const { absPath, relPath } = resolveWikiFile(project, wikiPath);
  if (!fs.existsSync(absPath)) {
    return createWikiPage(project, wikiPath, content);
  }
  const { data, content: existing } = matter(fs.readFileSync(absPath, 'utf8'));
  const merged = existing.trim() ? `${existing.trim()}\n\n${content}` : content;
  // See the note in updateWikiPage — never mutate gray-matter's returned `data` in place.
  const nextData = { ...data, updated: new Date().toISOString() };
  fs.writeFileSync(absPath, matter.stringify(merged, nextData), 'utf8');
  return parseWikiFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function readWikiPage(project: string, wikiPath: string): WikiPage {
  const { absPath, relPath } = resolveWikiFile(project, wikiPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No wiki page "${relPath}" in project "${project}".`);
  }
  return parseWikiFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function deleteWikiPage(project: string, wikiPath: string): WikiPage {
  const page = readWikiPage(project, wikiPath);
  const { absPath } = resolveWikiFile(project, wikiPath);
  fs.unlinkSync(absPath);
  return page;
}

/** Moves or renames a page. Renaming is just a move within the same parent folder. */
export function moveWikiPage(project: string, fromPath: string, toPath: string): WikiPage {
  const { absPath: fromAbs, relPath: fromRel } = resolveWikiFile(project, fromPath);
  const { absPath: toAbs, relPath: toRel } = resolveWikiFile(project, toPath);
  if (!fs.existsSync(fromAbs)) {
    throw new Error(`No wiki page "${fromRel}" in project "${project}".`);
  }
  if (fs.existsSync(toAbs)) {
    throw new Error(`A wiki page already exists at "${toRel}".`);
  }
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.renameSync(fromAbs, toAbs);
  // Keep the displayed title in sync with the new filename, Obsidian-style — otherwise a
  // renamed page keeps showing its old title forever. Built as a new object rather than
  // mutating gray-matter's returned `data` — see the note in updateWikiPage.
  const { data, content } = matter(fs.readFileSync(toAbs, 'utf8'));
  const nextData = { ...data, title: toRel.split('/').pop() };
  fs.writeFileSync(toAbs, matter.stringify(content, nextData), 'utf8');
  return parseWikiFile(fs.readFileSync(toAbs, 'utf8'), toRel);
}

/** Creates an empty folder. Unlike pages, folders are meaningful even with nothing in them yet. */
export function createWikiFolder(project: string, folderPath: string): { path: string } {
  const { absPath, relPath } = resolveWikiFolder(project, folderPath);
  if (!relPath) throw new Error('Folder path cannot be empty.');
  if (fs.existsSync(absPath)) {
    throw new Error(`A folder or page already exists at "${relPath}".`);
  }
  fs.mkdirSync(absPath, { recursive: true });
  return { path: relPath };
}

/** Deletes a folder and everything inside it. */
export function deleteWikiFolder(project: string, folderPath: string): { path: string } {
  const { absPath, relPath } = resolveWikiFolder(project, folderPath);
  if (!relPath) throw new Error('Cannot delete the wiki root.');
  if (!fs.existsSync(absPath)) {
    throw new Error(`No folder "${relPath}" in project "${project}".`);
  }
  fs.rmSync(absPath, { recursive: true, force: true });
  return { path: relPath };
}

/** Moves or renames a folder. Renaming is just a move within the same parent folder. */
export function moveWikiFolder(project: string, fromPath: string, toPath: string): { path: string } {
  const { absPath: fromAbs, relPath: fromRel } = resolveWikiFolder(project, fromPath);
  const { absPath: toAbs, relPath: toRel } = resolveWikiFolder(project, toPath);
  if (!fromRel) throw new Error('Cannot move the wiki root.');
  if (!fs.existsSync(fromAbs)) {
    throw new Error(`No folder "${fromRel}" in project "${project}".`);
  }
  if (fs.existsSync(toAbs)) {
    throw new Error(`A folder or page already exists at "${toRel}".`);
  }
  if (toAbs === fromAbs || toAbs.startsWith(fromAbs + path.sep)) {
    throw new Error('Cannot move a folder into itself.');
  }
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.renameSync(fromAbs, toAbs);
  return { path: toRel };
}

export function listWikiFolder(
  project: string,
  folderPath?: string
): { folders: string[]; pages: { path: string; title: string; updated: string }[] } {
  const { absPath, relPath } = resolveWikiFolder(project, folderPath);
  const folders: string[] = [];
  const pages: { path: string; title: string; updated: string }[] = [];
  if (!fs.existsSync(absPath)) return { folders, pages };
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      folders.push(relPath ? `${relPath}/${entry.name}` : entry.name);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const pagePath = (relPath ? `${relPath}/${entry.name}` : entry.name).replace(/\.md$/, '');
      const { data } = matter(fs.readFileSync(path.join(absPath, entry.name), 'utf8'));
      pages.push({
        path: pagePath,
        title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(pagePath),
        updated: normalizeDate(data.updated),
      });
    }
  }
  return { folders, pages };
}

function buildTree(absDir: string, relDir: string): WikiTreeNode[] {
  if (!fs.existsSync(absDir)) return [];
  const nodes: WikiTreeNode[] = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      const children = buildTree(path.join(absDir, entry.name), relPath);
      nodes.push({ name: entry.name, path: relPath, type: 'folder', children });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = (relDir ? `${relDir}/${entry.name}` : entry.name).replace(/\.md$/, '');
      const { data } = matter(fs.readFileSync(path.join(absDir, entry.name), 'utf8'));
      nodes.push({
        name: entry.name.replace(/\.md$/, ''),
        path: relPath,
        type: 'page',
        title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(relPath),
        updated: normalizeDate(data.updated),
      });
    }
  }
  return nodes;
}

export function getWikiTree(project: string, folderPath?: string): WikiTreeNode[] {
  const { absPath, relPath } = resolveWikiFolder(project, folderPath);
  return buildTree(absPath, relPath);
}
