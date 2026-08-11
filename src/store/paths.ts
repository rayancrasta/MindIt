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

export function projectDir(project: string): string {
  const dir = path.join(dataDir(), slugify(project));
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

export function logPath(project: string): string {
  return path.join(projectDir(project), 'LOG.md');
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

export function listProjectSlugs(): string[] {
  return fs
    .readdirSync(dataDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}
