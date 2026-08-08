import fs from 'node:fs';
import type { SessionEntry } from '../types.js';
import { logPath, slugify } from './paths.js';

function parseBlock(project: string, blockText: string): SessionEntry {
  const [headingLine, ...rest] = blockText.split('\n');
  const timestamp = headingLine.trim();
  const body = rest.join('\n');
  const fields: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (['done', 'blockers', 'next'].includes(key) && value) fields[key] = value;
  }
  return { project, timestamp, done: fields.done ?? '', blockers: fields.blockers, next: fields.next };
}

export function appendSessionEntry(
  project: string,
  entry: { done: string; blockers?: string; next?: string }
): string {
  const p = logPath(project);
  const slug = slugify(project);
  const exists = fs.existsSync(p);
  const raw = exists ? fs.readFileSync(p, 'utf8') : `# ${slug} — Session Log\n`;
  const idx = raw.indexOf('\n## ');
  const header = (idx === -1 ? raw : raw.slice(0, idx)).replace(/\n+$/, '');
  const rest = idx === -1 ? '' : raw.slice(idx);
  const timestamp = new Date().toISOString();
  let block = `\n\n## ${timestamp}\n\ndone: ${entry.done}\n`;
  if (entry.blockers) block += `blockers: ${entry.blockers}\n`;
  if (entry.next) block += `next: ${entry.next}\n`;
  fs.writeFileSync(p, header + block + rest, 'utf8');
  return timestamp;
}

export function getLastSessionEntry(project: string): SessionEntry | null {
  const p = logPath(project);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8');
  const parts = raw.split('\n## ');
  if (parts.length < 2) return null;
  return parseBlock(slugify(project), parts[1]);
}

export function getRecentSessionEntries(project: string, n: number): SessionEntry[] {
  const p = logPath(project);
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf8');
  const parts = raw.split('\n## ');
  return parts.slice(1, n + 1).map((block) => parseBlock(slugify(project), block));
}
