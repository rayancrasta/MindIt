import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SchemaColumn, SchemaTable, SchemaTreeNode } from '../types.js';
import { schemasDir } from './paths.js';

const UNSAFE_CHARS = /[<>:"|?*\x00-\x1f]/g;

function sanitizeSegment(segment: string): string {
  return segment.trim().replace(UNSAFE_CHARS, '').replace(/\\/g, '');
}

function splitPath(schemaPath: string): string[] {
  const segments = schemaPath
    .split('/')
    .map((s) => sanitizeSegment(s))
    .filter((s) => s.length > 0);
  for (const s of segments) {
    if (s === '.' || s === '..') {
      throw new Error(`Invalid schema path segment "${s}".`);
    }
  }
  if (segments.length === 0) {
    throw new Error('Schema path cannot be empty.');
  }
  return segments;
}

/** Resolves a user-supplied table path to an absolute .md file path, guaranteed to stay within the project's schemas root. */
function resolveSchemaFile(project: string, schemaPath: string): { absPath: string; relPath: string } {
  const root = schemasDir(project);
  const segments = splitPath(schemaPath);
  const last = segments[segments.length - 1];
  segments[segments.length - 1] = last.endsWith('.md') ? last : `${last}.md`;
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Schema path "${schemaPath}" escapes the schemas root.`);
  }
  const relPath = segments.join('/').replace(/\.md$/, '');
  return { absPath, relPath };
}

/** Resolves a user-supplied folder path (possibly empty, meaning the schemas root) within the project's schemas root. */
function resolveSchemaFolder(project: string, folderPath?: string): { absPath: string; relPath: string } {
  const root = schemasDir(project);
  if (!folderPath || !folderPath.trim()) return { absPath: root, relPath: '' };
  const segments = splitPath(folderPath);
  const absPath = path.resolve(root, ...segments);
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new Error(`Schema folder "${folderPath}" escapes the schemas root.`);
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

function normalizeColumns(v: unknown): SchemaColumn[] {
  if (!Array.isArray(v)) return [];
  const columns: SchemaColumn[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    if (typeof c.name !== 'string' || !c.name.trim() || typeof c.type !== 'string' || !c.type.trim()) continue;
    const column: SchemaColumn = { name: c.name, type: c.type };
    if (typeof c.nullable === 'boolean') column.nullable = c.nullable;
    if (typeof c.primaryKey === 'boolean') column.primaryKey = c.primaryKey;
    if (c.foreignKey && typeof c.foreignKey === 'object') {
      const fk = c.foreignKey as Record<string, unknown>;
      if (typeof fk.table === 'string' && fk.table.trim() && typeof fk.column === 'string' && fk.column.trim()) {
        column.foreignKey = { table: fk.table, column: fk.column };
      }
    }
    columns.push(column);
  }
  return columns;
}

function parseSchemaFile(raw: string, relPath: string): SchemaTable {
  const { data, content } = matter(raw);
  return {
    path: relPath,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : titleFromPath(relPath),
    description: content.trim(),
    columns: normalizeColumns(data.columns),
    created: normalizeDate(data.created),
    updated: normalizeDate(data.updated),
  };
}

export function createSchemaTable(
  project: string,
  schemaPath: string,
  columns: SchemaColumn[] = [],
  description = '',
  title?: string
): SchemaTable {
  const { absPath, relPath } = resolveSchemaFile(project, schemaPath);
  if (fs.existsSync(absPath)) {
    throw new Error(
      `Schema table "${relPath}" already exists in project "${project}". Use update_schema_table instead.`
    );
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const now = new Date().toISOString();
  const data = { title: title?.trim() || titleFromPath(relPath), created: now, updated: now, columns };
  fs.writeFileSync(absPath, matter.stringify(description, data), 'utf8');
  return parseSchemaFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function updateSchemaTable(
  project: string,
  schemaPath: string,
  columns: SchemaColumn[],
  description: string
): SchemaTable {
  const { absPath, relPath } = resolveSchemaFile(project, schemaPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No schema table "${relPath}" in project "${project}".`);
  }
  const { data } = matter(fs.readFileSync(absPath, 'utf8'));
  data.updated = new Date().toISOString();
  data.columns = columns;
  fs.writeFileSync(absPath, matter.stringify(description, data), 'utf8');
  return parseSchemaFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export function readSchemaTable(project: string, schemaPath: string): SchemaTable {
  const { absPath, relPath } = resolveSchemaFile(project, schemaPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`No schema table "${relPath}" in project "${project}".`);
  }
  return parseSchemaFile(fs.readFileSync(absPath, 'utf8'), relPath);
}

export interface CreateSchemaTableInput {
  path: string;
  columns?: SchemaColumn[];
  description?: string;
  title?: string;
}

/** Creates several tables in one call. A failure on one entry (e.g. it already exists) doesn't stop the rest. */
export function createSchemaTables(
  project: string,
  tables: CreateSchemaTableInput[]
): { created: SchemaTable[]; errors: { path: string; message: string }[] } {
  const created: SchemaTable[] = [];
  const errors: { path: string; message: string }[] = [];
  for (const t of tables) {
    try {
      created.push(createSchemaTable(project, t.path, t.columns ?? [], t.description ?? '', t.title));
    } catch (err) {
      errors.push({ path: t.path, message: (err as Error).message });
    }
  }
  return { created, errors };
}

/** Adds a column, or replaces the existing one with the same name, without touching any other column or the description. */
export function setSchemaColumn(project: string, schemaPath: string, column: SchemaColumn): SchemaTable {
  const table = readSchemaTable(project, schemaPath);
  const idx = table.columns.findIndex((c) => c.name === column.name);
  const columns = table.columns.slice();
  if (idx >= 0) columns[idx] = column;
  else columns.push(column);
  return updateSchemaTable(project, schemaPath, columns, table.description);
}

/** Removes a single column by name, without touching any other column or the description. */
export function deleteSchemaColumn(project: string, schemaPath: string, columnName: string): SchemaTable {
  const table = readSchemaTable(project, schemaPath);
  if (!table.columns.some((c) => c.name === columnName)) {
    throw new Error(`No column "${columnName}" on table "${schemaPath}" in project "${project}".`);
  }
  const columns = table.columns.filter((c) => c.name !== columnName);
  return updateSchemaTable(project, schemaPath, columns, table.description);
}

export function deleteSchemaTable(project: string, schemaPath: string): SchemaTable {
  const table = readSchemaTable(project, schemaPath);
  const { absPath } = resolveSchemaFile(project, schemaPath);
  fs.unlinkSync(absPath);
  return table;
}

export function listSchemaFolder(
  project: string,
  folderPath?: string
): { folders: string[]; pages: { path: string; title: string; updated: string }[] } {
  const { absPath, relPath } = resolveSchemaFolder(project, folderPath);
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

function buildTree(absDir: string, relDir: string): SchemaTreeNode[] {
  if (!fs.existsSync(absDir)) return [];
  const nodes: SchemaTreeNode[] = [];
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
        updated: normalizeDate(data.updated),
      });
    }
  }
  return nodes;
}

export function getSchemaTree(project: string, folderPath?: string): SchemaTreeNode[] {
  const { absPath, relPath } = resolveSchemaFolder(project, folderPath);
  return buildTree(absPath, relPath);
}

function collectTablePaths(nodes: SchemaTreeNode[], out: string[]): void {
  for (const node of nodes) {
    if (node.type === 'page') out.push(node.path);
    else if (node.children) collectTablePaths(node.children, out);
  }
}

/** Recursively reads every table under a project (or a folder within it) with full column data, for ER generation. */
export function listSchemaTablesRecursive(project: string, folderPath?: string): SchemaTable[] {
  const tree = getSchemaTree(project, folderPath);
  const paths: string[] = [];
  collectTablePaths(tree, paths);
  return paths.map((p) => readSchemaTable(project, p));
}

function sanitizeErdToken(v: string): string {
  return v.replace(/"/g, '').replace(/\s+/g, '_');
}

function quoteErdEntity(v: string): string {
  return `"${v.replace(/"/g, '')}"`;
}

/** Renders a set of schema tables as a Mermaid erDiagram string. */
export function buildErDiagram(tables: SchemaTable[]): string {
  const lines: string[] = ['erDiagram'];

  for (const table of tables) {
    if (table.columns.length === 0) continue;
    lines.push(`    ${quoteErdEntity(table.path)} {`);
    for (const col of table.columns) {
      const keys: string[] = [];
      if (col.primaryKey) keys.push('PK');
      if (col.foreignKey) keys.push('FK');
      const keyToken = keys.length ? ` ${keys.join(',')}` : '';
      lines.push(`        ${sanitizeErdToken(col.type)} ${sanitizeErdToken(col.name)}${keyToken}`);
    }
    lines.push('    }');
  }

  for (const table of tables) {
    for (const col of table.columns) {
      if (!col.foreignKey) continue;
      const label = `${sanitizeErdToken(col.name)} -> ${sanitizeErdToken(col.foreignKey.column)}`;
      lines.push(
        `    ${quoteErdEntity(table.path)} }o--|| ${quoteErdEntity(col.foreignKey.table)} : "${label}"`
      );
    }
  }

  return lines.join('\n');
}
