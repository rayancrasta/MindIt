import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Diagram, DiagramTreeNode } from '../types.js';
import { diagramsDir } from './paths.js';

const UNSAFE_CHARS = /[<>:"|?*\x00-\x1f]/g;

function sanitizeSegment(segment: string): string {
  return segment.trim().replace(UNSAFE_CHARS, '').replace(/\\/g, '');
}

function splitPath(diagramPath: string): string[] {
  const segments = diagramPath
    .split('/')
    .map((s) => sanitizeSegment(s))
    .filter((s) => s.length > 0);
  for (const s of segments) {
    if (s === '.' || s === '..') {
      throw new Error(`Invalid diagram path segment "${s}".`);
    }
  }
  if (segments.length === 0) {
    throw new Error('Diagram path cannot be empty.');
  }
  return segments;
}

/** Resolves a user-supplied diagram path to an absolute .mmd file path, guaranteed to stay within the project's diagrams root. */
function resolveDiagramFile(project: string, diagramPath: string): { absPath: string; relPath: string } {
  const root = diagramsDir(project);
  const segments = splitPath(diagramPath);
  const last = segments[segments.length - 1];
  segments[segments.length - 1] = last.endsWith('.mmd') ? last : `${last}.mmd`;
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Diagram path "${diagramPath}" escapes the diagrams root.`);
  }
  const relPath = segments.join('/').replace(/\.mmd$/, '');
  return { absPath, relPath };
}

/** Resolves a user-supplied folder path (possibly empty, meaning the diagrams root) within the project's diagrams root. */
function resolveDiagramFolder(project: string, folderPath?: string): { absPath: string; relPath: string } {
  const root = diagramsDir(project);
  if (!folderPath || !folderPath.trim()) return { absPath: root, relPath: '' };
  const segments = splitPath(folderPath);
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Diagram folder "${folderPath}" escapes the diagrams root.`);
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

function parseDiagramFile(raw: string, relPath: string): Diagram {
  const { data, content } = matter(raw);
  return {
    path: relPath,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(relPath),
    content: content.trim(),
    created: normalizeDate(data.created),
    updated: normalizeDate(data.updated),
  };
}

export function createDiagram(project: string, diagramPath: string, content = '', title?: string): Diagram {
  const { absPath, relPath } = resolveDiagramFile(project, diagramPath);
  if (fs.existsSync(absPath)) {
    throw new Error(
      `Diagram "${relPath}" already exists in project "${project}". Use update_diagram instead.`
    );
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const now = new Date().toISOString();
  const data = { title: title?.trim() || titleFromPath(relPath), created: now, updated: now };
  fs.writeFileSync(absPath, matter.stringify(content, data), 'utf8');
  return parseDiagramFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function updateDiagram(project: string, diagramPath: string, content: string): Diagram {
  const { absPath, relPath } = resolveDiagramFile(project, diagramPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No diagram "${relPath}" in project "${project}".`);
  }
  const { data } = matter(fs.readFileSync(absPath, 'utf8'));
  data.updated = new Date().toISOString();
  fs.writeFileSync(absPath, matter.stringify(content, data), 'utf8');
  return parseDiagramFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function readDiagram(project: string, diagramPath: string): Diagram {
  const { absPath, relPath } = resolveDiagramFile(project, diagramPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No diagram "${relPath}" in project "${project}".`);
  }
  return parseDiagramFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function deleteDiagram(project: string, diagramPath: string): Diagram {
  const diagram = readDiagram(project, diagramPath);
  const { absPath } = resolveDiagramFile(project, diagramPath);
  fs.unlinkSync(absPath);
  return diagram;
}

export function listDiagramFolder(
  project: string,
  folderPath?: string
): { folders: string[]; pages: { path: string; title: string; updated: string }[] } {
  const { absPath, relPath } = resolveDiagramFolder(project, folderPath);
  const folders: string[] = [];
  const pages: { path: string; title: string; updated: string }[] = [];
  if (!fs.existsSync(absPath)) return { folders, pages };
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      folders.push(relPath ? `${relPath}/${entry.name}` : entry.name);
    } else if (entry.isFile() && entry.name.endsWith('.mmd')) {
      const pagePath = (relPath ? `${relPath}/${entry.name}` : entry.name).replace(/\.mmd$/, '');
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

function buildTree(absDir: string, relDir: string): DiagramTreeNode[] {
  if (!fs.existsSync(absDir)) return [];
  const nodes: DiagramTreeNode[] = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      const children = buildTree(path.join(absDir, entry.name), relPath);
      if (children.length === 0) continue; // empty folders aren't meaningful nodes, same as a real filesystem
      nodes.push({ name: entry.name, path: relPath, type: 'folder', children });
    } else if (entry.isFile() && entry.name.endsWith('.mmd')) {
      const relPath = (relDir ? `${relDir}/${entry.name}` : entry.name).replace(/\.mmd$/, '');
      const { data } = matter(fs.readFileSync(path.join(absDir, entry.name), 'utf8'));
      nodes.push({
        name: entry.name.replace(/\.mmd$/, ''),
        path: relPath,
        type: 'page',
        title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(relPath),
        updated: normalizeDate(data.updated),
      });
    }
  }
  return nodes;
}

export function getDiagramTree(project: string, folderPath?: string): DiagramTreeNode[] {
  const { absPath, relPath } = resolveDiagramFolder(project, folderPath);
  return buildTree(absPath, relPath);
}
