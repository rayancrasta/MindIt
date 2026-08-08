import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateComment } from '../store/items.js';
import { safeHandler } from './common.js';

export function registerUpdateCommentTool(server: McpServer): void {
  server.registerTool(
    'update_comment',
    {
      title: 'Update Comment',
      description: "Edit the text of an existing comment on an item, by the item's number and the comment's id.",
      inputSchema: {
        id: z.string().min(1).describe('The item number, e.g. "42" or "#42"'),
        commentId: z.string().min(1).describe('The comment id, as returned by add_comment or get_item'),
        text: z.string().min(1).describe('New comment body (markdown supported)'),
      },
    },
    safeHandler(({ id, commentId, text }) => {
      const item = updateComment(id, commentId, text);
      return `Updated comment ${commentId} on ${item.type} "${item.title}" [${item.id}].`;
    })
  );
}
