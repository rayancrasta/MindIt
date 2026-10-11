import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listProjectSlugs } from '../store/paths.js';
import { migrateLegacyLog, searchSessionEntries } from '../store/sessions.js';
import type { SessionEntry } from '../types.js';
import { clip, firstParagraph, safeHandler } from './common.js';

const BRIEF_FIELDS = ['items', 'summary', 'blockers', 'next'] as const;
type BriefField = (typeof BRIEF_FIELDS)[number];

function fullEntry(e: SessionEntry & { path: string }): string {
  return [
    `${e.timestamp} [${e.path}]${e.items?.length ? ` items: ${e.items.join(', ')}` : ''}`,
    `done: ${e.done}`,
    e.blockers ? `blockers: ${e.blockers}` : '',
    e.next ? `next: ${e.next}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Timestamp and path, then only the asked-for fields, each clipped; `summary` is the first paragraph of the body. */
function briefEntry(e: SessionEntry & { path: string }, fields: readonly BriefField[]): string {
  const has = (f: BriefField) => fields.includes(f);
  return [
    `${e.timestamp} [${e.path}]${has('items') && e.items?.length ? ` items: ${e.items.join(', ')}` : ''}`,
    has('summary') ? `summary: ${clip(firstParagraph(e.done), 300)}` : '',
    has('blockers') && e.blockers ? `blockers: ${clip(e.blockers, 600)}` : '',
    has('next') && e.next ? `next: ${clip(e.next, 600)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function registerHandoffTools(server: McpServer): void {
  server.registerTool(
    'search_handoffs',
    {
      title: 'Search Handoffs',
      description:
        'Search a project\'s handover history, newest first. All filters are optional and combine with AND; with ' +
        'none it returns the most recent entries. Each result includes the file path under handoffs/. By default ' +
        'each entry is brief: the first paragraph of the body as a summary, plus blockers and next, clipped. Pass ' +
        'detail: true for the full bodies, or fields to pick which parts come back.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        query: z.string().optional().describe('Case-insensitive text to find in done/blockers/next'),
        item: z.string().optional().describe('Only entries that touched this item id, e.g. "14"'),
        since: z.string().optional().describe('Earliest date, inclusive: "2026-09" or "2026-09-28"'),
        until: z.string().optional().describe('Latest date, inclusive: "2026-09" or "2026-09-28"'),
        limit: z.number().int().positive().optional().describe('Max entries to return (default 20)'),
        fields: z
          .array(z.enum(BRIEF_FIELDS))
          .optional()
          .describe('Parts of each brief entry to return besides timestamp and path (default: all four)'),
        detail: z.boolean().optional().describe('Return each entry in full, with the whole body as `done`'),
      },
    },
    safeHandler(({ project, fields, detail, ...filters }) => {
      const results = searchSessionEntries(project, filters);
      if (results.length === 0) return 'No matching handoffs.';
      return results.map((e) => (detail ? fullEntry(e) : briefEntry(e, fields ?? BRIEF_FIELDS))).join('\n\n');
    })
  );

  server.registerTool(
    'migrate_handoffs',
    {
      title: 'Migrate Handoffs',
      description:
        'Convert legacy single-file LOG.md session logs into the handoffs/ layout (one file per entry grouped by ' +
        'month, plus INDEX.md). The original is kept as LOG.md.bak. Safe to re-run. Projects are also migrated ' +
        'automatically the first time their handoffs are read or written; use this to do it in bulk or preview it.',
      inputSchema: {
        project: z.string().optional().describe('Project to migrate; omit to migrate every registered project'),
        dry_run: z.boolean().optional().describe('If true, only report what would be migrated'),
      },
    },
    safeHandler(({ project, dry_run }) => {
      const slugs = project ? [project] : listProjectSlugs();
      const results = slugs.map((p) => migrateLegacyLog(p, { dryRun: dry_run }));
      const migrated = results.filter((r) => r.status !== 'nothing_to_migrate');
      if (migrated.length === 0) return 'Nothing to migrate.';
      return migrated
        .map((r) =>
          r.status === 'dry_run'
            ? `${r.project}: would migrate ${r.entries} entries`
            : `${r.project}: migrated ${r.entries} entries (original kept at ${r.backup})`
        )
        .join('\n');
    })
  );
}
