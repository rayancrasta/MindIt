import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { THOUGHT_KINDS } from '../types.js';
import type { DeveloperThought } from '../types.js';
import { addThought, deleteThought, getThought, listThoughts, updateThought } from '../store/thoughts.js';
import { safeHandler } from './common.js';

const kindSchema = z.enum(THOUGHT_KINDS);
const project = z.string().min(1).describe('Project name');
const id = z.string().min(1).describe('Thought id, as returned by add_thought/list_thoughts');

function format(t: DeveloperThought): string {
  const meta = [
    `[${t.id}] ${t.kind} — ${t.created}${t.updated ? ` (edited ${t.updated})` : ''}`,
    t.title ? `title: ${t.title}` : '',
    t.tags?.length ? `tags: ${t.tags.join(', ')}` : '',
    t.items?.length ? `items: ${t.items.join(', ')}` : '',
  ];
  return `${meta.filter(Boolean).join('\n')}\n\n${t.body}`;
}

export function registerThoughtTools(server: McpServer): void {
  server.registerTool(
    'add_thought',
    {
      title: 'Add Developer Thought',
      description:
        'Record a developer\'s own thought while building — a doubt, decision, idea or open question — so the ' +
        'reasoning behind the work can be looked back on later. Write it in the developer\'s voice and keep their ' +
        'wording. Each thought is its own file under thoughts/<YYYY-MM>/ and appears in thoughts/INDEX.md.',
      inputSchema: {
        project,
        body: z.string().min(1).describe('The thought itself, in the developer\'s own words'),
        kind: kindSchema.optional().describe('thought (default), doubt, decision, idea, or question'),
        title: z.string().optional().describe('Optional short headline'),
        tags: z.array(z.string()).optional().describe('Optional topic tags, e.g. ["auth", "caching"]'),
        items: z.array(z.string()).optional().describe('IDs of features/stories/tasks/bugs this relates to, e.g. ["12"]'),
      },
    },
    safeHandler(({ project, ...input }) => {
      const t = addThought(project, input);
      return `Recorded ${t.kind} [${t.id}] for ${t.project}.`;
    })
  );

  server.registerTool(
    'get_thought',
    {
      title: 'Get Developer Thought',
      description: 'Read one developer thought by id.',
      inputSchema: { project, id },
    },
    safeHandler(({ project, id }) => format(getThought(project, id)))
  );

  server.registerTool(
    'list_thoughts',
    {
      title: 'List Developer Thoughts',
      description:
        'List or search a project\'s developer thoughts, newest first. All filters are optional and combine with AND; ' +
        'with none it returns the most recent thoughts. Use it to recover how the developer was thinking about something.',
      inputSchema: {
        project,
        query: z.string().optional().describe('Case-insensitive text to find in the title or body'),
        kind: kindSchema.optional().describe('Only this kind'),
        tag: z.string().optional().describe('Only thoughts with this tag'),
        item: z.string().optional().describe('Only thoughts related to this item id, e.g. "14"'),
        since: z.string().optional().describe('Earliest date, inclusive: "2026-09" or "2026-09-28"'),
        until: z.string().optional().describe('Latest date, inclusive: "2026-09" or "2026-09-28"'),
        limit: z.number().int().positive().optional().describe('Max thoughts to return (default 20)'),
      },
    },
    safeHandler(({ project, ...filters }) => {
      const thoughts = listThoughts(project, filters);
      return thoughts.length === 0 ? 'No matching thoughts.' : thoughts.map(format).join('\n\n---\n\n');
    })
  );

  server.registerTool(
    'update_thought',
    {
      title: 'Update Developer Thought',
      description:
        'Edit an existing thought. Only the fields you pass change; tags and items are replaced as a whole, and an ' +
        'empty title/array clears that field. The creation time is kept and an edited time is added.',
      inputSchema: {
        project,
        id,
        body: z.string().optional().describe('New text, replacing the existing body'),
        kind: kindSchema.optional(),
        title: z.string().optional().describe('New title; empty string clears it'),
        tags: z.array(z.string()).optional().describe('Replacement tags; empty array clears them'),
        items: z.array(z.string()).optional().describe('Replacement item ids; empty array clears them'),
      },
    },
    safeHandler(({ project, id, ...changes }) => {
      const t = updateThought(project, id, changes);
      return `Updated ${t.kind} [${t.id}].`;
    })
  );

  server.registerTool(
    'delete_thought',
    {
      title: 'Delete Developer Thought',
      description: 'Permanently delete a developer thought by id. Fails if it doesn\'t exist.',
      inputSchema: { project, id },
    },
    safeHandler(({ project, id }) => {
      const t = deleteThought(project, id);
      return `Deleted ${t.kind} [${t.id}].`;
    })
  );
}
