import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteDeploymentNote } from '../store/deployments.js';
import { safeHandler } from './common.js';

export function registerDeleteDeploymentNoteTool(server: McpServer): void {
  server.registerTool(
    'delete_deployment_note',
    {
      title: 'Delete Deployment Note',
      description: 'Delete a deployment note.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        id: z.string().min(1).describe('The deployment note number'),
      },
    },
    safeHandler(({ project, id }) => deleteDeploymentNote(project, id))
  );
}
