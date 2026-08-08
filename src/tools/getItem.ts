import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findItemGlobal } from '../store/items.js';
import { safeHandler } from './common.js';

export function registerGetItemTool(server: McpServer): void {
  server.registerTool(
    'get_item',
    {
      title: 'Get Item',
      description:
        'Look up a feature, story, task, or bug by its number alone, regardless of type or project.',
      inputSchema: {
        id: z.string().min(1).describe('The item number, e.g. "42" or "#42"'),
      },
    },
    safeHandler(({ id }) => {
      const found = findItemGlobal(id);
      if (!found) return `No item found with number ${id}.`;
      return JSON.stringify(found.item, null, 2);
    })
  );
}
