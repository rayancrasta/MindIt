import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { addComment } from '../store/items.js';
import { safeHandler } from './common.js';

export function registerAddCommentTool(server: McpServer): void {
  server.registerTool(
    'add_comment',
    {
      title: 'Add Comment',
      description:
        'Add a comment to a feature, story, task, or bug by its number — like a discussion thread entry on an ADO work item. Markdown is supported.',
      inputSchema: {
        id: z.string().min(1).describe('The item number, e.g. "42" or "#42"'),
        text: z.string().min(1).describe('Comment body (markdown supported)'),
        author: z.string().optional().describe('Who is posting — defaults to "Claude Code"'),
      },
    },
    safeHandler(({ id, text, author }) => {
      const item = addComment(id, text, author?.trim() || 'Claude Code');
      const count = item.comments?.length ?? 0;
      return `Added comment to ${item.type} "${item.title}" [${item.id}] (${count} comment${count === 1 ? '' : 's'} total).`;
    })
  );
}
