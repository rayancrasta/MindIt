import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateDeploymentNote } from '../store/deployments.js';
import { DEPLOYMENT_STATUSES } from '../types.js';
import { safeHandler } from './common.js';

export function registerUpdateDeploymentNoteTool(server: McpServer): void {
  server.registerTool(
    'update_deployment_note',
    {
      title: 'Update Deployment Note',
      description: 'Correct a deployment note — its commit hash, environment, status, deployer, timestamp, or notes.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        id: z.string().min(1).describe('The deployment note number'),
        commitHash: z.string().min(7).optional(),
        environment: z.string().optional(),
        status: z.enum(DEPLOYMENT_STATUSES as [string, ...string[]]).optional(),
        deployedBy: z.string().optional(),
        timestamp: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    safeHandler(({ project, id, commitHash, environment, status, deployedBy, timestamp, notes }) => {
      const note = updateDeploymentNote(project, id, {
        commitHash,
        environment,
        status,
        deployedBy,
        timestamp,
        notes,
      });
      return `Updated deployment note [${note.id}] — ${note.commitHash} → ${note.environment} (${note.status}).`;
    })
  );
}
