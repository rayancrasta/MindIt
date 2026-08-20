import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listDeploymentNotes } from '../store/deployments.js';
import { DEPLOYMENT_STATUSES, type DeploymentStatus } from '../types.js';
import { safeHandler } from './common.js';

export function registerListDeploymentNotesTool(server: McpServer): void {
  server.registerTool(
    'list_deployment_notes',
    {
      title: 'List Deployment Notes',
      description: 'List deployment notes, optionally filtered by project, environment, and/or status.',
      inputSchema: {
        project: z.string().optional().describe('Project name; omit to list across all projects'),
        environment: z.string().optional().describe('Filter by environment, e.g. "production"'),
        status: z.enum(DEPLOYMENT_STATUSES as [string, ...string[]]).optional().describe('Filter by outcome'),
        limit: z.number().int().positive().optional(),
      },
    },
    safeHandler(({ project, environment, status, limit }) => {
      const notes = listDeploymentNotes(project, { environment, status: status as DeploymentStatus | undefined }, limit);
      if (notes.length === 0) return 'None found.';
      return notes
        .map(
          (n) =>
            `${n.commitHash} [${n.id}] → ${n.environment} (${n.status}) by ${n.deployedBy} at ${n.timestamp}${project ? '' : ` — ${n.project}`}`
        )
        .join('\n');
    })
  );
}
