import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { addDeploymentNote } from '../store/deployments.js';
import { DEPLOYMENT_STATUSES } from '../types.js';
import { safeHandler } from './common.js';

export function registerAddDeploymentNoteTool(server: McpServer): void {
  server.registerTool(
    'add_deployment_note',
    {
      title: 'Add Deployment Note',
      description:
        'Record a deployment for a project — the commit that was shipped, when, to which environment, and how it went.',
      inputSchema: {
        project: z.string().min(1).describe('Project name'),
        commitHash: z.string().min(7).describe('Git commit hash that was deployed (7-40 hex characters)'),
        environment: z.string().optional().describe('Target environment — defaults to "production"'),
        status: z.enum(DEPLOYMENT_STATUSES as [string, ...string[]]).optional().describe('Deployment outcome — defaults to "success"'),
        deployedBy: z.string().optional().describe('Who deployed it — defaults to the local OS username'),
        timestamp: z.string().optional().describe('ISO timestamp of the deployment — defaults to now'),
        notes: z.string().optional().describe('Free-text notes: what changed, why, anything noteworthy'),
      },
    },
    safeHandler(({ project, commitHash, environment, status, deployedBy, timestamp, notes }) => {
      const note = addDeploymentNote(project, commitHash, {
        environment,
        status: status as (typeof DEPLOYMENT_STATUSES)[number] | undefined,
        deployedBy,
        timestamp,
        notes,
      });
      return `Recorded deployment [${note.id}] of ${note.commitHash} to ${note.environment} (${note.status}) by ${note.deployedBy} at ${note.timestamp}.`;
    })
  );
}
