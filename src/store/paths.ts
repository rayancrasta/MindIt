import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import type { ItemType } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // .../src/store
const repoRoot = path.resolve(__dirname, '..', '..'); // repo root

const ITEM_DIR_NAMES: Record<ItemType, string> = {
  feature: 'features',
  story: 'stories',
  task: 'tasks',
  bug: 'bugs',
};

export function slugify(input: string, maxLength = 50): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

export function dataDir(): string {
  const dir = path.join(repoRoot, 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface ProjectMeta {
  slug: string;
  name: string;
  /** Absolute path holding this project's files, or null for the default location inside data/. */
  path: string | null;
  created: string;
}

const EXTERNAL_SUBDIR = '.mindit';

function registryFile(): string {
  return path.join(dataDir(), 'projects.json');
}

function readRegistryRaw(): ProjectMeta[] {
  const file = registryFile();
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRegistry(entries: ProjectMeta[]): void {
  fs.writeFileSync(registryFile(), JSON.stringify(entries, null, 2), 'utf8');
}

/** Reconciles the registry against data/*, registering any folder (e.g. dropped in manually, or from before the registry existed) that isn't tracked yet. */
function loadRegistry(): ProjectMeta[] {
  const entries = readRegistryRaw();
  const known = new Set(entries.map((e) => e.slug));
  const dirSlugs = fs
    .readdirSync(dataDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  let changed = false;
  for (const slug of dirSlugs) {
    if (!known.has(slug)) {
      entries.push({ slug, name: slug, path: null, created: new Date().toISOString() });
      changed = true;
    }
  }
  if (changed) writeRegistry(entries);
  return entries;
}

export function listProjects(): ProjectMeta[] {
  return loadRegistry();
}

export function getProjectMeta(slug: string): ProjectMeta | undefined {
  return listProjects().find((p) => p.slug === slug);
}

export function createProject(input: { name: string; path?: string }): ProjectMeta {
  const name = input.name.trim();
  const slug = slugify(name);
  if (!slug) throw new Error('A project name is required.');
  const entries = readRegistryRaw();
  if (entries.some((e) => e.slug === slug)) {
    throw new Error(`A project named "${slug}" already exists.`);
  }
  let resolvedPath: string | null = null;
  if (input.path && input.path.trim()) {
    const abs = path.resolve(input.path.trim());
    resolvedPath = path.join(abs, EXTERNAL_SUBDIR);
    if (entries.some((e) => e.path === resolvedPath)) {
      throw new Error('Another project already uses this folder.');
    }
  }
  const meta: ProjectMeta = { slug, name, path: resolvedPath, created: new Date().toISOString() };
  fs.mkdirSync(resolvedPath ?? path.join(dataDir(), slug), { recursive: true });
  entries.push(meta);
  writeRegistry(entries);
  return meta;
}

export function renameProject(slug: string, name: string): ProjectMeta {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A project name is required.');
  const entries = readRegistryRaw();
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) throw new Error(`Project "${slug}" not found.`);
  entry.name = trimmed;
  writeRegistry(entries);
  return entry;
}

/** Unregisters a project. Files on disk are left untouched, whether internal or external. */
export function removeProject(slug: string): void {
  const entries = readRegistryRaw();
  const next = entries.filter((e) => e.slug !== slug);
  if (next.length === entries.length) throw new Error(`Project "${slug}" not found.`);
  writeRegistry(next);
}

export function projectDir(project: string): string {
  const slug = slugify(project);
  const meta = getProjectMeta(slug);
  const dir = meta?.path ? meta.path : path.join(dataDir(), slug);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function itemDir(type: ItemType, project: string): string {
  const dir = path.join(projectDir(project), ITEM_DIR_NAMES[type]);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function featuresDir(project: string): string {
  return itemDir('feature', project);
}

export function storiesDir(project: string): string {
  return itemDir('story', project);
}

export function tasksDir(project: string): string {
  return itemDir('task', project);
}

export function bugsDir(project: string): string {
  return itemDir('bug', project);
}

/** The pre-handoffs single-file session log; only read by the one-off migration to handoffs/. */
export function logPath(project: string): string {
  return path.join(projectDir(project), 'LOG.md');
}

export function thoughtsDir(project: string): string {
  return path.join(projectDir(project), 'thoughts');
}

export function assumptionsDir(project: string): string {
  return path.join(projectDir(project), 'assumptions');
}

export function handoffsDir(project: string): string {
  return path.join(projectDir(project), 'handoffs');
}

export function wikiDir(project: string): string {
  const dir = path.join(projectDir(project), 'wiki');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function deploymentsDir(project: string): string {
  const dir = path.join(projectDir(project), 'deployments');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function diagramsDir(project: string): string {
  const dir = path.join(projectDir(project), 'diagrams');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function schemasDir(project: string): string {
  const dir = path.join(projectDir(project), 'schemas');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function specsDir(project: string, platform: 'web' | 'mobile'): string {
  const dir = path.join(projectDir(project), 'specs', platform);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function listProjectSlugs(): string[] {
  return listProjects().map((p) => p.slug);
}
