import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SpecPlatform, SpecScreen, SpecStatus, SpecTestCase, SpecTestType, SpecTransition, SpecTreeNode } from '../types.js';
import { specsDir } from './paths.js';

const UNSAFE_CHARS = /[<>:"|?*\x00-\x1f]/g;

function sanitizeSegment(segment: string): string {
  return segment.trim().replace(UNSAFE_CHARS, '').replace(/\\/g, '');
}

function splitPath(specPath: string): string[] {
  const segments = specPath
    .split('/')
    .map((s) => sanitizeSegment(s))
    .filter((s) => s.length > 0);
  for (const s of segments) {
    if (s === '.' || s === '..') {
      throw new Error(`Invalid spec path segment "${s}".`);
    }
  }
  if (segments.length === 0) {
    throw new Error('Spec path cannot be empty.');
  }
  return segments;
}

/** Resolves a user-supplied screen path to an absolute .md file path, guaranteed to stay within the platform's specs root. */
function resolveSpecFile(project: string, platform: SpecPlatform, specPath: string): { absPath: string; relPath: string } {
  const root = specsDir(project, platform);
  const segments = splitPath(specPath);
  const last = segments[segments.length - 1];
  segments[segments.length - 1] = last.endsWith('.md') ? last : `${last}.md`;
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Spec path "${specPath}" escapes the specs root.`);
  }
  const relPath = segments.join('/').replace(/\.md$/, '');
  return { absPath, relPath };
}

/** Resolves a user-supplied folder path (possibly empty, meaning the platform's specs root) within it. */
function resolveSpecFolder(project: string, platform: SpecPlatform, folderPath?: string): { absPath: string; relPath: string } {
  const root = specsDir(project, platform);
  if (!folderPath || !folderPath.trim()) return { absPath: root, relPath: '' };
  const segments = splitPath(folderPath);
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Spec folder "${folderPath}" escapes the specs root.`);
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

function normalizeStatus(v: unknown): SpecStatus {
  return v === 'in_review' || v === 'approved' ? v : 'draft';
}

function normalizeStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  return arr.length ? arr : undefined;
}

function normalizeTransitions(v: unknown): SpecTransition[] {
  if (!Array.isArray(v)) return [];
  const out: SpecTransition[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const t = raw as Record<string, unknown>;
    if (typeof t.label !== 'string' || !t.label.trim()) continue;
    const target = typeof t.target === 'string' && t.target.trim() ? t.target.trim() : undefined;
    const external = typeof t.external === 'string' && t.external.trim() ? t.external.trim() : undefined;
    if (!target && !external) continue;
    out.push(target ? { label: t.label, target } : { label: t.label, external });
  }
  return out;
}

function normalizeTestCases(v: unknown): SpecTestCase[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: SpecTestCase[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const t = raw as Record<string, unknown>;
    const type: SpecTestType = t.type === 'integration' ? 'integration' : 'unit';
    if (typeof t.description !== 'string' || !t.description.trim()) continue;
    out.push({ type, description: t.description });
  }
  return out.length ? out : undefined;
}

function parseSpecFile(raw: string, relPath: string, platform: SpecPlatform): SpecScreen {
  const { data, content } = matter(raw);
  const screen: SpecScreen = {
    path: relPath,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(relPath),
    platform,
    status: normalizeStatus(data.status),
    entryPoints: normalizeTransitions(data.entryPoints),
    exitPoints: normalizeTransitions(data.exitPoints),
    description: content.trim(),
    created: normalizeDate(data.created),
    updated: normalizeDate(data.updated),
  };
  if (typeof data.designUrl === 'string' && data.designUrl.trim()) screen.designUrl = data.designUrl.trim();
  const tags = normalizeStringArray(data.tags);
  if (tags) screen.tags = tags;
  const acceptanceCriteria = normalizeStringArray(data.acceptanceCriteria);
  if (acceptanceCriteria) screen.acceptanceCriteria = acceptanceCriteria;
  const testCases = normalizeTestCases(data.testCases);
  if (testCases) screen.testCases = testCases;
  const codeRefs = normalizeStringArray(data.codeRefs);
  if (codeRefs) screen.codeRefs = codeRefs;
  const dataRefs = normalizeStringArray(data.dataRefs);
  if (dataRefs) screen.dataRefs = dataRefs;
  return screen;
}

export interface SpecScreenInput {
  title?: string;
  designUrl?: string;
  status?: SpecStatus;
  tags?: string[];
  entryPoints?: SpecTransition[];
  exitPoints?: SpecTransition[];
  acceptanceCriteria?: string[];
  testCases?: SpecTestCase[];
  codeRefs?: string[];
  dataRefs?: string[];
  description?: string;
}

function toFrontmatter(relPath: string, input: SpecScreenInput, created: string, updated: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    title: input.title?.trim() || titleFromPath(relPath),
    status: input.status ?? 'draft',
    entryPoints: input.entryPoints ?? [],
    exitPoints: input.exitPoints ?? [],
    created,
    updated,
  };
  if (input.designUrl?.trim()) data.designUrl = input.designUrl.trim();
  if (input.tags?.length) data.tags = input.tags;
  if (input.acceptanceCriteria?.length) data.acceptanceCriteria = input.acceptanceCriteria;
  if (input.testCases?.length) data.testCases = input.testCases;
  if (input.codeRefs?.length) data.codeRefs = input.codeRefs;
  if (input.dataRefs?.length) data.dataRefs = input.dataRefs;
  return data;
}

export function createSpecScreen(
  project: string,
  platform: SpecPlatform,
  specPath: string,
  input: SpecScreenInput = {}
): SpecScreen {
  const { absPath, relPath } = resolveSpecFile(project, platform, specPath);
  if (fs.existsSync(absPath)) {
    throw new Error(`Spec screen "${relPath}" already exists in project "${project}" (${platform}). Use update_spec_screen instead.`);
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const now = new Date().toISOString();
  const data = toFrontmatter(relPath, input, now, now);
  fs.writeFileSync(absPath, matter.stringify(input.description ?? '', data), 'utf8');
  return parseSpecFile(fs.readFileSync(absPath, 'utf8'), relPath, platform);
}

export function updateSpecScreen(
  project: string,
  platform: SpecPlatform,
  specPath: string,
  input: SpecScreenInput
): SpecScreen {
  const { absPath, relPath } = resolveSpecFile(project, platform, specPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No spec screen "${relPath}" in project "${project}" (${platform}).`);
  }
  const existingScreen = readSpecScreen(project, platform, specPath);
  // A field left undefined keeps its existing value — only fields the caller actually passes are overwritten.
  const merged: SpecScreenInput = {
    title: input.title ?? existingScreen.title,
    designUrl: input.designUrl ?? existingScreen.designUrl,
    status: input.status ?? existingScreen.status,
    tags: input.tags ?? existingScreen.tags,
    entryPoints: input.entryPoints ?? existingScreen.entryPoints,
    exitPoints: input.exitPoints ?? existingScreen.exitPoints,
    acceptanceCriteria: input.acceptanceCriteria ?? existingScreen.acceptanceCriteria,
    testCases: input.testCases ?? existingScreen.testCases,
    codeRefs: input.codeRefs ?? existingScreen.codeRefs,
    dataRefs: input.dataRefs ?? existingScreen.dataRefs,
  };
  const data = toFrontmatter(relPath, merged, existingScreen.created, new Date().toISOString());
  const description = input.description ?? existingScreen.description;
  fs.writeFileSync(absPath, matter.stringify(description, data), 'utf8');
  return parseSpecFile(fs.readFileSync(absPath, 'utf8'), relPath, platform);
}

export function readSpecScreen(project: string, platform: SpecPlatform, specPath: string): SpecScreen {
  const { absPath, relPath } = resolveSpecFile(project, platform, specPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No spec screen "${relPath}" in project "${project}" (${platform}).`);
  }
  return parseSpecFile(fs.readFileSync(absPath, 'utf8'), relPath, platform);
}

export function deleteSpecScreen(project: string, platform: SpecPlatform, specPath: string): SpecScreen {
  const screen = readSpecScreen(project, platform, specPath);
  const { absPath } = resolveSpecFile(project, platform, specPath);
  fs.unlinkSync(absPath);
  return screen;
}

/** Adds a transition, or replaces the existing one with the same label in the same direction, without touching anything else. */
export function setSpecTransition(
  project: string,
  platform: SpecPlatform,
  specPath: string,
  direction: 'entry' | 'exit',
  transition: SpecTransition
): SpecScreen {
  const screen = readSpecScreen(project, platform, specPath);
  const key = direction === 'entry' ? 'entryPoints' : 'exitPoints';
  const list = screen[key].slice();
  const idx = list.findIndex((t) => t.label === transition.label);
  if (idx >= 0) list[idx] = transition;
  else list.push(transition);
  return updateSpecScreen(project, platform, specPath, { [key]: list } as SpecScreenInput);
}

/** Removes a single transition by direction and label, without touching anything else. */
export function deleteSpecTransition(
  project: string,
  platform: SpecPlatform,
  specPath: string,
  direction: 'entry' | 'exit',
  label: string
): SpecScreen {
  const screen = readSpecScreen(project, platform, specPath);
  const key = direction === 'entry' ? 'entryPoints' : 'exitPoints';
  if (!screen[key].some((t) => t.label === label)) {
    throw new Error(`No ${direction} point "${label}" on screen "${specPath}" in project "${project}" (${platform}).`);
  }
  const list = screen[key].filter((t) => t.label !== label);
  return updateSpecScreen(project, platform, specPath, { [key]: list } as SpecScreenInput);
}

export function listSpecFolder(
  project: string,
  platform: SpecPlatform,
  folderPath?: string
): { folders: string[]; pages: { path: string; title: string; status: SpecStatus; updated: string }[] } {
  const { absPath, relPath } = resolveSpecFolder(project, platform, folderPath);
  const folders: string[] = [];
  const pages: { path: string; title: string; status: SpecStatus; updated: string }[] = [];
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
        status: normalizeStatus(data.status),
        updated: normalizeDate(data.updated),
      });
    }
  }
  return { folders, pages };
}

function buildTree(absDir: string, relDir: string): SpecTreeNode[] {
  if (!fs.existsSync(absDir)) return [];
  const nodes: SpecTreeNode[] = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      const children = buildTree(path.join(absDir, entry.name), relPath);
      if (children.length === 0) continue; // empty folders aren't meaningful nodes, same as a real filesystem
      nodes.push({ name: entry.name, path: relPath, type: 'folder', children });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = (relDir ? `${relDir}/${entry.name}` : entry.name).replace(/\.md$/, '');
      const { data } = matter(fs.readFileSync(path.join(absDir, entry.name), 'utf8'));
      nodes.push({
        name: entry.name.replace(/\.md$/, ''),
        path: relPath,
        type: 'page',
        title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(relPath),
        status: normalizeStatus(data.status),
        updated: normalizeDate(data.updated),
      });
    }
  }
  return nodes;
}

export function getSpecTree(project: string, platform: SpecPlatform, folderPath?: string): SpecTreeNode[] {
  const { absPath, relPath } = resolveSpecFolder(project, platform, folderPath);
  return buildTree(absPath, relPath);
}

function collectSpecPaths(nodes: SpecTreeNode[], out: string[]): void {
  for (const node of nodes) {
    if (node.type === 'page') out.push(node.path);
    else if (node.children) collectSpecPaths(node.children, out);
  }
}

/** Recursively reads every screen under a project's platform tree (or a folder within it), for the journey diagram and relations view. */
export function listSpecScreensRecursive(project: string, platform: SpecPlatform, folderPath?: string): SpecScreen[] {
  const tree = getSpecTree(project, platform, folderPath);
  const paths: string[] = [];
  collectSpecPaths(tree, paths);
  return paths.map((p) => readSpecScreen(project, platform, p));
}

function sanitizeToken(v: string): string {
  return v.replace(/[^a-zA-Z0-9_]/g, '_');
}

function quoteLabel(v: string): string {
  return `"${v.replace(/"/g, "'")}"`;
}

/**
 * Renders a set of screens as a Mermaid flowchart, deriving every edge from entryPoints/exitPoints —
 * journeys are never stored, only ever generated on demand from the screens that exist right now.
 */
export function buildSpecJourneyDiagram(screens: SpecScreen[]): string {
  const lines: string[] = ['flowchart LR'];
  const pathsPresent = new Set(screens.map((s) => s.path));
  const screenNodeId = (p: string) => `screen_${sanitizeToken(p)}`;
  const externalNodeId = (label: string) => `external_${sanitizeToken(label)}`;

  const nodeLines = new Set<string>();
  const externalLines = new Set<string>();
  for (const screen of screens) {
    nodeLines.add(`    ${screenNodeId(screen.path)}[${quoteLabel(screen.title)}]`);
  }

  type Edge = { source: string; target: string; label: string };
  const edgeKeys = new Set<string>();
  const edges: Edge[] = [];
  function addEdge(source: string, target: string, label: string) {
    const key = `${source}->${target}:${label}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target, label });
  }

  for (const screen of screens) {
    for (const exit of screen.exitPoints) {
      if (exit.target && pathsPresent.has(exit.target)) {
        addEdge(screenNodeId(screen.path), screenNodeId(exit.target), exit.label);
      } else if (exit.external) {
        externalLines.add(`    ${externalNodeId(exit.external)}((${quoteLabel(exit.external)}))`);
        addEdge(screenNodeId(screen.path), externalNodeId(exit.external), exit.label);
      }
    }
    for (const entry of screen.entryPoints) {
      if (entry.target && pathsPresent.has(entry.target)) {
        addEdge(screenNodeId(entry.target), screenNodeId(screen.path), entry.label);
      } else if (entry.external) {
        externalLines.add(`    ${externalNodeId(entry.external)}((${quoteLabel(entry.external)}))`);
        addEdge(externalNodeId(entry.external), screenNodeId(screen.path), entry.label);
      }
    }
  }

  lines.push(...Array.from(nodeLines), ...Array.from(externalLines));
  for (const edge of edges) {
    lines.push(`    ${edge.source} -->|${edge.label.replace(/\|/g, '/')}| ${edge.target}`);
  }

  return lines.join('\n');
}
