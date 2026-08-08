import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteComment } from '../store/items.js';
import { safeHandler } from './common.js';

export function registerDeleteCommentTool(server: McpServer): void {
  server.registerTool(
    'delete_comment',
    {
      title: 'Delete Comment',
      description: "Remove a comment from an item, by the item's number and the comment's id.",
      inputSchema: {
        id: z.string().min(1).describe('The item number, e.g. "42" or "#42"'),
        commentId: z.string().min(1).describe('The comment id, as returned by add_comment or get_item'),
      },
    },
    safeHandler(({ id, commentId }) => {
      const item = deleteComment(id, commentId);
      return `Deleted comment ${commentId} from ${item.type} "${item.title}" [${item.id}].`;
    })
  );
}
