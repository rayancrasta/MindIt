import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SessionEntry } from '../types.js';
import { handoffsDir, logPath, slugify } from './paths.js';

// Layout: handoffs/<YYYY-MM>/<timestamp>.md, one file per handover (YAML frontmatter + `done` as the
// body), plus handoffs/INDEX.md — one line per entry, newest first. Filenames sort chronologically.

const INDEX_FILE = 'INDEX.md';
const SUMMARY_LENGTH = 120;

export interface HandoffSearch {
  query?: string;
  item?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface MigrationResult {
  project: string;
  status: 'migrated' | 'dry_run' | 'nothing_to_migrate';
  entries: number;
  backup?: string;
}

function monthOf(timestamp: string): string {
  return /^\d{4}-\d{2}/.test(timestamp) ? timestamp.slice(0, 7) : 'undated';
}

function stampOf(timestamp: string): string {
  return timestamp.replace(/[^0-9A-Za-z-]+/g, '-').replace(/-+$/, '');
}

function summaryOf(entry: SessionEntry): string {
  const line = entry.done.split('\n')[0].trim();
  return line.length > SUMMARY_LENGTH ? `${line.slice(0, SUMMARY_LENGTH - 1)}…` : line;
}

function indexLine(entry: SessionEntry, relPath: string): string {
  const items = entry.items && entry.items.length ? ` · items: ${entry.items.join(', ')}` : '';
  return `- ${entry.timestamp} · [${relPath}](${relPath})${items} · ${summaryOf(entry)}`;
}

function indexHeader(project: string): string {
  return `# ${slugify(project)} — Handoff Index\n`;
}

function entryFiles(project: string): string[] {
  const root = handoffsDir(project);
  if (!fs.existsSync(root)) return [];
  const months = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();
  const files: string[] = [];
  for (const month of months) {
    const names = fs
      .readdirSync(path.join(root, month))
      .filter((n) => n.endsWith('.md'))
      .sort()
      .reverse();
    for (const name of names) files.push(`${month}/${name}`);
  }
  return files;
}

function readEntryFile(project: string, relPath: string): SessionEntry {
  const { data, content } = matter(fs.readFileSync(path.join(handoffsDir(project), relPath), 'utf8'));
  const items = Array.isArray(data.items) ? data.items.map(String) : undefined;
  return {
    project: slugify(project),
    timestamp: String(data.timestamp ?? ''),
    done: content.trim(),
    ...(data.blockers ? { blockers: String(data.blockers) } : {}),
    ...(data.next ? { next: String(data.next) } : {}),
    ...(items && items.length ? { items } : {}),
  };
}

/** Writes one handover file and returns its path relative to handoffs/. Never overwrites an existing file. */
function writeEntryFile(project: string, entry: Omit<SessionEntry, 'project'>): string {
  const dir = path.join(handoffsDir(project), monthOf(entry.timestamp));
  fs.mkdirSync(dir, { recursive: true });
  const base = stampOf(entry.timestamp);
  let name = `${base}.md`;
  for (let n = 2; fs.existsSync(path.join(dir, name)); n++) name = `${base}-${n}.md`;
  const data: Record<string, unknown> = { timestamp: entry.timestamp };
  if (entry.items && entry.items.length) data.items = entry.items;
  if (entry.blockers) data.blockers = entry.blockers;
  if (entry.next) data.next = entry.next;
  fs.writeFileSync(path.join(dir, name), matter.stringify(entry.done, data), 'utf8');
  return `${monthOf(entry.timestamp)}/${name}`;
}

/** Regenerates INDEX.md from the entry files on disk. */
export function rebuildHandoffIndex(project: string): number {
  const files = entryFiles(project);
  const lines = files.map((f) => indexLine(readEntryFile(project, f), f));
  fs.mkdirSync(handoffsDir(project), { recursive: true });
  fs.writeFileSync(
    path.join(handoffsDir(project), INDEX_FILE),
    `${indexHeader(project)}\n${lines.join('\n')}${lines.length ? '\n' : ''}`,
    'utf8'
  );
  return lines.length;
}

function prependIndexLine(project: string, line: string): void {
  const file = path.join(handoffsDir(project), INDEX_FILE);
  if (!fs.existsSync(file)) {
    rebuildHandoffIndex(project);
    return;
  }
  const raw = fs.readFileSync(file, 'utf8');
  const idx = raw.indexOf('\n- ');
  const header = (idx === -1 ? raw : raw.slice(0, idx)).replace(/\n+$/, '');
  const rest = idx === -1 ? '' : raw.slice(idx + 1);
  fs.writeFileSync(file, `${header}\n\n${line}\n${rest}`, 'utf8');
}

/** Parses the legacy LOG.md. Tolerates multi-line field values, which the old reader silently truncated. */
function parseLegacyLog(raw: string): Omit<SessionEntry, 'project'>[] {
  const entries: Omit<SessionEntry, 'project'>[] = [];
  let current: { timestamp: string; fields: Record<string, string> } | null = null;
  let field: string | null = null;
  const flush = () => {
    if (!current) return;
    const f = current.fields;
    const items = f.items ? f.items.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    entries.push({
      timestamp: current.timestamp,
      done: (f.done ?? '').trim(),
      ...(f.blockers?.trim() ? { blockers: f.blockers.trim() } : {}),
      ...(f.next?.trim() ? { next: f.next.trim() } : {}),
      ...(items && items.length ? { items } : {}),
    });
  };
  for (const line of raw.split('\n')) {
    // Only ISO-timestamp headings start an entry (the only form ever written); other `## ` lines are body text.
    const heading = /^## (\d{4}-\d{2}-\d{2}T\S*)\s*$/.exec(line);
    if (heading) {
      flush();
      current = { timestamp: heading[1].trim(), fields: {} };
      field = null;
      continue;
    }
    if (!current) continue;
    const kv = /^(done|blockers|next|items):\s?(.*)$/.exec(line);
    if (kv) {
      field = kv[1];
      current.fields[field] = kv[2];
    } else if (field) {
      current.fields[field] += `\n${line}`;
    }
  }
  flush();
  return entries;
}

/**
 * Moves a legacy LOG.md into handoffs/ (one file per entry + INDEX.md) and renames the original to
 * LOG.md.bak. Idempotent: entries whose timestamp already has a file are skipped, so a half-finished
 * run can be repeated.
 */
export function migrateLegacyLog(project: string, opts: { dryRun?: boolean } = {}): MigrationResult {
  const slug = slugify(project);
  const legacy = logPath(project);
  if (!fs.existsSync(legacy)) return { project: slug, status: 'nothing_to_migrate', entries: 0 };
  const entries = parseLegacyLog(fs.readFileSync(legacy, 'utf8'));
  if (opts.dryRun) return { project: slug, status: 'dry_run', entries: entries.length };

  const existing = new Set(entryFiles(project).map((f) => readEntryFile(project, f).timestamp));
  for (const entry of entries) {
    if (!existing.has(entry.timestamp)) writeEntryFile(project, entry);
  }
  rebuildHandoffIndex(project);

  let backup = `${legacy}.bak`;
  for (let n = 2; fs.existsSync(backup); n++) backup = `${legacy}.bak.${n}`;
  fs.renameSync(legacy, backup);
  return { project: slug, status: 'migrated', entries: entries.length, backup };
}

/** Lazily migrates a legacy LOG.md the first time its project's handoffs are read or written. */
function ensureMigrated(project: string): void {
  if (fs.existsSync(logPath(project))) migrateLegacyLog(project);
}

export function appendSessionEntry(
  project: string,
  entry: { done: string; blockers?: string; next?: string; items?: string[] }
): string {
  ensureMigrated(project);
  const timestamp = new Date().toISOString();
  const full = { ...entry, timestamp };
  const relPath = writeEntryFile(project, full);
  prependIndexLine(project, indexLine({ ...full, project: slugify(project) }, relPath));
  return timestamp;
}

export function getLastSessionEntry(project: string): SessionEntry | null {
  return getRecentSessionEntries(project, 1)[0] ?? null;
}

export function getRecentSessionEntries(project: string, n: number): SessionEntry[] {
  ensureMigrated(project);
  return entryFiles(project)
    .slice(0, n)
    .map((f) => readEntryFile(project, f));
}

/** Newest-first search over a project's handovers. Dates are prefix-compared, so "2026-09" or "2026-09-28" both work. */
export function searchSessionEntries(
  project: string,
  { query, item, since, until, limit = 20 }: HandoffSearch
): (SessionEntry & { path: string })[] {
  ensureMigrated(project);
  const q = query?.toLowerCase();
  const wantedItem = item?.replace(/^#/, '');
  const results: (SessionEntry & { path: string })[] = [];
  for (const file of entryFiles(project)) {
    if (results.length >= limit) break;
    const entry = readEntryFile(project, file);
    if (since && entry.timestamp.slice(0, since.length) < since) continue;
    if (until && entry.timestamp.slice(0, until.length) > until) continue;
    if (wantedItem && !entry.items?.includes(wantedItem)) continue;
    if (q && !`${entry.done}\n${entry.blockers ?? ''}\n${entry.next ?? ''}`.toLowerCase().includes(q)) continue;
    results.push({ ...entry, path: `handoffs/${file}` });
  }
  return results;
}
