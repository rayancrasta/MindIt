import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findDeploymentNote } from '../store/deployments.js';
import { safeHandler } from './common.js';

export function registerGetDeploymentNoteTool(server: McpServer): void {
  server.registerTool(
    'get_deployment_note',
    {
      title: 'Get Deployment Note',
      description: 'Look up a single deployment note by its number.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        id: z.string().min(1).describe('The deployment note number, e.g. "42" or "#42"'),
      },
    },
    safeHandler(({ project, id }) => {
      const note = findDeploymentNote(project, id);
      if (!note) return `No deployment note found with number ${id}.`;
      return JSON.stringify(note, null, 2);
    })
  );
}
