import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readWikiPage } from '../store/wiki.js';
import { capText, clip, safeHandler } from './common.js';
import { wikiLink } from './wikiLink.js';

const DEFAULT_MAX_CHARS = 12_000;
const GREP_LINE_CHARS = 300;

interface Line {
  n: number;
  text: string;
  /** Heading level (1–6), or 0 for a body line. Lines inside fenced code blocks are never headings. */
  level: number;
}

function parseLines(content: string): Line[] {
  let fenced = false;
  return content.split('\n').map((text, i) => {
    if (/^\s*(```|~~~)/.test(text)) fenced = !fenced;
    const h = fenced ? null : /^(#{1,6})\s/.exec(text);
    return { n: i + 1, text, level: h ? h[1].length : 0 };
  });
}

function headingText(line: Line): string {
  return line.text.replace(/^#+\s*/, '').trim();
}

/** The heading matching `name` (exact first, then substring, case-insensitive) and everything under it. */
function sectionLines(lines: Line[], name: string): Line[] {
  const want = name.replace(/^#+\s*/, '').trim().toLowerCase();
  const headings = lines.filter((l) => l.level);
  const start =
    headings.find((l) => headingText(l).toLowerCase() === want) ??
    headings.find((l) => headingText(l).toLowerCase().includes(want));
  if (!start) {
    const list = headings.map((l) => `${'#'.repeat(l.level)} ${headingText(l)}`).join('\n') || '(none)';
    throw new Error(`No heading matching "${name}". Headings on this page:\n${list}`);
  }
  const from = lines.indexOf(start);
  const end = lines.findIndex((l, i) => i > from && l.level && l.level <= start.level);
  return lines.slice(from, end === -1 ? undefined : end);
}

/** Matching lines prefixed with their line number, each under the nearest heading above it (printed once). */
function grepLines(lines: Line[], all: Line[], pattern: string, lineChars: number): string {
  const q = pattern.toLowerCase();
  const inRange = new Set(lines);
  const out: string[] = [];
  let heading: Line | undefined;
  let printed: Line | undefined;
  for (const line of all) {
    if (line.level) heading = line;
    if (line.level || !inRange.has(line) || !line.text.toLowerCase().includes(q)) continue;
    if (heading && heading !== printed) {
      out.push(`${'#'.repeat(heading.level)} ${headingText(heading)}`);
      printed = heading;
    }
    out.push(`${line.n}: ${lineChars ? clip(line.text, lineChars) : line.text}`);
  }
  return out.length ? out.join('\n') : `No lines matching "${pattern}".`;
}

/** Whole lines that fit in `maxChars`, with a notice naming the offset to continue from when cut short. */
function capLines(lines: Line[], total: number, maxChars: number, lineChars: number | undefined): string {
  const out: string[] = [];
  let size = 0;
  for (const line of lines) {
    const text = lineChars ? clip(line.text, lineChars) : line.text;
    if (out.length && size + text.length + 1 > maxChars) {
      const last = lines[out.length - 1].n;
      return (
        `${out.join('\n')}\n\n[Truncated: showing lines ${lines[0].n}–${last} of ${total}. Pass offset: ${last + 1} ` +
        `to continue, or narrow with section or grep.]`
      );
    }
    out.push(text);
    size += text.length + 1;
  }
  return out.join('\n');
}

export function registerReadWikiPageTool(server: McpServer): void {
  server.registerTool(
    'read_wiki_page',
    {
      title: 'Read Wiki Page',
      description:
        'Read a wiki page by its path. Returns the whole body up to max_chars (default 12,000), with a notice ' +
        'saying where to continue if cut. To read less: section returns one heading and everything under it, ' +
        'grep returns only matching lines (with line numbers, under their headings), offset/limit select lines. ' +
        'They combine: section narrows first, then offset/limit, then grep.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        path: z.string().min(1).describe('Path of the page, e.g. "Architecture/Database Design"'),
        section: z.string().optional().describe('Heading to return with its content, e.g. "Product and UI"'),
        grep: z.string().optional().describe('Case-insensitive text; only lines containing it are returned, e.g. "[Open]"'),
        offset: z.number().int().positive().optional().describe('First line to return (1-based page line number)'),
        limit: z.number().int().positive().optional().describe('Number of lines to return from offset'),
        line_chars: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe(`Clip each returned line to this many characters (grep default ${GREP_LINE_CHARS}; 0 = no clip)`),
        max_chars: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(`Most characters of page content to return (default ${DEFAULT_MAX_CHARS.toLocaleString('en-US')})`),
      },
    },
    safeHandler(({ project, path, section, grep, offset, limit, line_chars, max_chars }) => {
      const page = readWikiPage(project, path);
      const header = `# ${page.title}\n(${wikiLink(project, page.path)}, updated ${page.updated})\n\n`;
      if (!page.content) return `${header}_This page is empty._`;

      const all = parseLines(page.content);
      const maxChars = max_chars ?? DEFAULT_MAX_CHARS;
      let lines = section ? sectionLines(all, section) : all;
      if (offset || limit) {
        const from = offset ?? 1;
        lines = lines.filter((l) => l.n >= from && (!limit || l.n < from + limit));
      }
      if (grep) {
        const body = grepLines(lines, all, grep, line_chars ?? GREP_LINE_CHARS);
        return header + capText(body, maxChars, 'Narrow with section, offset/limit or a tighter grep.');
      }
      if (lines.length === 0) return `${header}_No lines in that range (the page has ${all.length})._`;
      const partial = lines.length < all.length ? `(lines ${lines[0].n}–${lines[lines.length - 1].n} of ${all.length})\n\n` : '';
      return header + partial + capLines(lines, all.length, maxChars, line_chars || undefined);
    }, { cap: false })
  );
}
