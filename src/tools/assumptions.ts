import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ASSUMPTION_STATUSES, CONFIDENCE_LEVELS } from '../types.js';
import type { Assumption } from '../types.js';
import {
  addAssumption,
  deleteAssumption,
  getAssumption,
  listAssumptions,
  listAssumptionsForReview,
  reviewAssumption,
  updateAssumption,
} from '../store/assumptions.js';
import { safeHandler } from './common.js';

const confidenceSchema = z.enum(CONFIDENCE_LEVELS);
const statusSchema = z.enum(ASSUMPTION_STATUSES);
const project = z.string().min(1).describe('Project name');
const id = z.string().min(1).describe('Assumption id, as returned by add_assumption/list_assumptions');

// Fields shared by add_assumption and update_assumption (title is declared separately on each).
const fields = {
  body: z.string().optional().describe('Context: what was ambiguous and what was decided'),
  confidence: confidenceSchema.optional().describe('How sure you are: low, medium (default) or high'),
  alternatives: z.string().optional().describe('Other options that were considered'),
  impact: z.string().optional().describe('What breaks or changes if the assumption is wrong'),
  question: z.string().optional().describe('The specific thing a human should confirm'),
  tags: z.array(z.string()).optional().describe('Topic tags, e.g. ["auth"]'),
  items: z.array(z.string()).optional().describe('IDs of features/stories/tasks/bugs this relates to, e.g. ["12"]'),
  wiki: z.array(z.string()).optional().describe('Wiki page paths this relates to'),
  refs: z
    .array(z.string())
    .optional()
    .describe('Other docs: "spec:<platform>:<path>", "diagram:<kind>:<path>" or "schema:<path>"'),
  code: z.array(z.string()).optional().describe('Code locations, e.g. ["src/auth.ts:42"]'),
};

/** Plain-text rendering shared by get/list tools: a header line, labelled fields, then the body. */
function format(a: Assumption): string {
  const lines = [
    `[${a.id}] ${a.status} · ${a.confidence} confidence — ${a.created}${a.updated ? ` (edited ${a.updated})` : ''}`,
    `assumption: ${a.title}`,
    a.alternatives ? `alternatives: ${a.alternatives}` : '',
    a.impact ? `impact if wrong: ${a.impact}` : '',
    a.question ? `to confirm: ${a.question}` : '',
    a.reviewedAt ? `reviewed: ${a.reviewedAt}${a.reviewNote ? ` — ${a.reviewNote}` : ''}` : '',
    a.tags?.length ? `tags: ${a.tags.join(', ')}` : '',
    a.items?.length ? `items: ${a.items.join(', ')}` : '',
    a.wiki?.length ? `wiki: ${a.wiki.join(', ')}` : '',
    a.refs?.length ? `refs: ${a.refs.join(', ')}` : '',
    a.code?.length ? `code: ${a.code.join(', ')}` : '',
  ];
  return `${lines.filter(Boolean).join('\n')}${a.body ? `\n\n${a.body}` : ''}`;
}

export function registerAssumptionTools(server: McpServer): void {
  server.registerTool(
    'add_assumption',
    {
      title: 'Add Assumption',
      description:
        'Record an assumption you made under ambiguity — call this WHENEVER you proceed without being sure: a ' +
        'requirement was unclear, several options looked plausible, or you filled a gap instead of asking. A human ' +
        'reviews these later so nothing guessed is missed. Link it to the work item, wiki pages, docs and code it ' +
        'affects. Each assumption is its own file under assumptions/<YYYY-MM>/ and appears in assumptions/INDEX.md.',
      inputSchema: {
        project,
        title: z.string().min(1).describe('The assumption, in one line, e.g. "Treated deleted users as soft-deleted"'),
        ...fields,
      },
    },
    safeHandler(({ project, ...input }) => {
      const a = addAssumption(project, input);
      return `Recorded ${a.confidence}-confidence assumption [${a.id}] for ${a.project}.`;
    })
  );

  server.registerTool(
    'get_assumption',
    {
      title: 'Get Assumption',
      description: 'Read one assumption by id.',
      inputSchema: { project, id },
    },
    safeHandler(({ project, id }) => format(getAssumption(project, id)))
  );

  server.registerTool(
    'list_assumptions',
    {
      title: 'List Assumptions',
      description:
        'List or search a project\'s recorded assumptions, newest first. All filters are optional and combine with ' +
        'AND. Use it to see what was guessed on a work item or wiki page before building on it.',
      inputSchema: {
        project,
        query: z.string().optional().describe('Case-insensitive text to find in the title, body, impact or question'),
        confidence: confidenceSchema.optional().describe('Only this confidence level'),
        status: statusSchema.optional().describe('Only open (unreviewed) or reviewed assumptions'),
        tag: z.string().optional().describe('Only assumptions with this tag'),
        item: z.string().optional().describe('Only assumptions related to this item id, e.g. "14"'),
        wiki: z.string().optional().describe('Only assumptions linked to this wiki page path'),
        since: z.string().optional().describe('Earliest date, inclusive: "2026-09" or "2026-09-28"'),
        until: z.string().optional().describe('Latest date, inclusive: "2026-09" or "2026-09-28"'),
        limit: z.number().int().positive().optional().describe('Max assumptions to return (default 20)'),
      },
    },
    safeHandler(({ project, ...filters }) => {
      const found = listAssumptions(project, filters);
      return found.length === 0 ? 'No matching assumptions.' : found.map(format).join('\n\n---\n\n');
    })
  );

  server.registerTool(
    'list_unreviewed_assumptions',
    {
      title: 'List Unreviewed Assumptions',
      description:
        'List every assumption that has not been reviewed yet (status open), lowest confidence first. Use this to ' +
        'find what still needs review; after reviewing one, call review_assumption to mark it done.',
      inputSchema: {
        project,
        item: z.string().optional().describe('Only those related to this item id, e.g. "14"'),
        wiki: z.string().optional().describe('Only those linked to this wiki page path'),
        limit: z.number().int().positive().optional().describe('Max to return (default: all)'),
      },
    },
    safeHandler(({ project, item, wiki, limit }) => {
      const wantedItem = item?.replace(/^#/, '');
      const found = listAssumptionsForReview(project)
        .filter((a) => (!wantedItem || a.items?.includes(wantedItem)) && (!wiki || a.wiki?.includes(wiki)))
        .slice(0, limit);
      return found.length === 0 ? 'No unreviewed assumptions.' : found.map(format).join('\n\n---\n\n');
    })
  );

  server.registerTool(
    'review_assumption',
    {
      title: 'Review Assumption',
      description:
        'Mark an assumption as reviewed/addressed once it has been checked — confirmed, corrected or dismissed. ' +
        'Pass a short `note` with the outcome (e.g. "Confirmed: soft delete is fine" or "Changed to hard delete in #31"). ' +
        'Set `reopen` to true to put it back to open.',
      inputSchema: {
        project,
        id,
        note: z.string().optional().describe('Outcome of the review'),
        reopen: z.boolean().optional().describe('true to mark it open (unreviewed) again'),
      },
    },
    safeHandler(({ project, id, note, reopen }) => {
      const a = reviewAssumption(project, id, { note, reopen });
      return `Assumption [${a.id}] is now ${a.status}.`;
    })
  );

  server.registerTool(
    'update_assumption',
    {
      title: 'Update Assumption',
      description:
        'Edit an existing assumption — e.g. raise confidence or note what the human decided. Only the fields you ' +
        'pass change; lists are replaced as a whole, and an empty string/array clears that field.',
      inputSchema: {
        project,
        id,
        title: z.string().optional().describe('New one-line assumption'),
        ...fields,
      },
    },
    safeHandler(({ project, id, ...changes }) => {
      const a = updateAssumption(project, id, changes);
      return `Updated assumption [${a.id}].`;
    })
  );

  server.registerTool(
    'delete_assumption',
    {
      title: 'Delete Assumption',
      description: 'Permanently delete an assumption by id. Fails if it doesn\'t exist.',
      inputSchema: { project, id },
    },
    safeHandler(({ project, id }) => {
      const a = deleteAssumption(project, id);
      return `Deleted assumption [${a.id}].`;
    })
  );
}
