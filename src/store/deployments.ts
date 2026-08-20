import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import matter from 'gray-matter';
import { DEPLOYMENT_STATUSES, type DeploymentNote, type DeploymentStatus } from '../types.js';
import { deploymentsDir, listProjectSlugs, slugify } from './paths.js';
import { nextId } from './counter.js';

const ID_WIDTH = 5;
const COMMIT_HASH_RE = /^[0-9a-f]{7,40}$/i;

function normalizeDate(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

function parseDeploymentFile(raw: string): DeploymentNote {
  const { data, content } = matter(raw);
  const notes = content.trim() ? content.trim() : undefined;
  return {
    ...data,
    id: String(data.id),
    timestamp: normalizeDate(data.timestamp),
    created: normalizeDate(data.created),
    updated: normalizeDate(data.updated),
    notes,
  } as DeploymentNote;
}

function filePath(project: string, id: string): string {
  return path.join(deploymentsDir(project), `${id.padStart(ID_WIDTH, '0')}.md`);
}

function normalizeIdMatch(match: string): string | null {
  const m = match.trim().match(/^#?(\d+)$/);
  return m ? String(Number(m[1])) : null;
}

export interface AddDeploymentNoteOptions {
  environment?: string;
  status?: DeploymentStatus;
  deployedBy?: string;
  timestamp?: string;
  notes?: string;
}

export function addDeploymentNote(
  project: string,
  commitHash: string,
  opts: AddDeploymentNoteOptions = {}
): DeploymentNote {
  if (!COMMIT_HASH_RE.test(commitHash)) {
    throw new Error(`"${commitHash}" doesn't look like a git commit hash (expected 7-40 hex characters).`);
  }
  if (opts.status && !DEPLOYMENT_STATUSES.includes(opts.status)) {
    throw new Error(`Invalid status "${opts.status}". Must be one of: ${DEPLOYMENT_STATUSES.join(', ')}.`);
  }
  const id = nextId();
  const now = new Date().toISOString();
  const data: Record<string, unknown> = {
    id,
    project: slugify(project),
    commitHash,
    environment: opts.environment?.trim() || 'production',
    status: opts.status ?? 'success',
    deployedBy: opts.deployedBy?.trim() || os.userInfo().username,
    timestamp: opts.timestamp ?? now,
    created: now,
    updated: now,
  };
  const file = matter.stringify(opts.notes ?? '', data);
  fs.writeFileSync(filePath(project, id), file, 'utf8');
  return parseDeploymentFile(fs.readFileSync(filePath(project, id), 'utf8'));
}

export interface ListDeploymentNotesFilters {
  environment?: string;
  status?: DeploymentStatus;
}

export function listDeploymentNotes(
  project?: string,
  filters: ListDeploymentNotesFilters = {},
  limit?: number
): DeploymentNote[] {
  const projects = project ? [slugify(project)] : listProjectSlugs();
  const notes: DeploymentNote[] = [];
  for (const p of projects) {
    const dir = deploymentsDir(p);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const note = parseDeploymentFile(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (filters.environment && note.environment !== filters.environment) continue;
      if (filters.status && note.status !== filters.status) continue;
      notes.push(note);
    }
  }
  notes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return typeof limit === 'number' ? notes.slice(0, limit) : notes;
}

export function findDeploymentNote(project: string, match: string): DeploymentNote | null {
  const id = normalizeIdMatch(match);
  if (id === null) return null;
  const file = filePath(project, id);
  if (!fs.existsSync(file)) return null;
  return parseDeploymentFile(fs.readFileSync(file, 'utf8'));
}

export function updateDeploymentNote(
  project: string,
  match: string,
  patch: Record<string, unknown>
): DeploymentNote {
  const found = findDeploymentNote(project, match);
  if (!found) {
    throw new Error(`No deployment note matching "${match}" in project "${slugify(project)}".`);
  }
  if (patch.commitHash !== undefined && !COMMIT_HASH_RE.test(String(patch.commitHash))) {
    throw new Error(`"${patch.commitHash}" doesn't look like a git commit hash (expected 7-40 hex characters).`);
  }
  if (patch.status !== undefined && !DEPLOYMENT_STATUSES.includes(patch.status as DeploymentStatus)) {
    throw new Error(`Invalid status "${patch.status}". Must be one of: ${DEPLOYMENT_STATUSES.join(', ')}.`);
  }
  const file = filePath(project, found.id);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const { notes, ...rest } = patch;
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) data[key] = value;
  }
  data.updated = new Date().toISOString();
  const newContent = notes !== undefined ? String(notes) : content;
  fs.writeFileSync(file, matter.stringify(newContent, data), 'utf8');
  return parseDeploymentFile(fs.readFileSync(file, 'utf8'));
}

export function deleteDeploymentNote(project: string, match: string): string {
  const found = findDeploymentNote(project, match);
  if (!found) {
    return `No deployment note matching "${match}" found.`;
  }
  fs.unlinkSync(filePath(project, found.id));
  return `Deleted deployment note [${found.id}] (${found.commitHash} — ${found.environment}).`;
}

export function getLastDeploymentNote(project: string): DeploymentNote | null {
  return listDeploymentNotes(project, {}, 1)[0] ?? null;
}
