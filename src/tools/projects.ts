import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createProject, listProjects, removeProject, renameProject } from '../store/paths.js';
import type { ProjectMeta } from '../store/paths.js';
import { safeHandler } from './common.js';

function describeProject(p: ProjectMeta): string {
  return `${p.name} [${p.slug}] — ${p.path ?? 'default location (data/' + p.slug + '/)'}`;
}

export function registerProjectTools(server: McpServer): void {
  server.registerTool(
    'list_projects',
    {
      title: 'List Projects',
      description: 'List all registered projects with their slug and storage location.',
      inputSchema: {},
    },
    safeHandler(() => {
      const projects = listProjects();
      return projects.length === 0 ? 'No projects.' : projects.map(describeProject).join('\n');
    })
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create Project',
      description:
        'Create a project explicitly. Optional — other tools create a project on first use — but this is the only ' +
        'way to point a project at an external folder, in which case its files live under <path>/.mindit/.',
      inputSchema: {
        name: z.string().min(1).describe('Project name; its slug is derived from this'),
        path: z
          .string()
          .optional()
          .describe('Absolute path of an external folder (e.g. an existing repo); omit to store under data/<slug>/'),
      },
    },
    safeHandler(({ name, path }) => `Created project ${describeProject(createProject({ name, path }))}.`)
  );

  server.registerTool(
    'rename_project',
    {
      title: 'Rename Project',
      description: 'Change a project\'s display name. The slug and files on disk do not move.',
      inputSchema: {
        slug: z.string().min(1).describe('Slug of the project to rename, as shown by list_projects'),
        name: z.string().min(1).describe('New display name'),
      },
    },
    safeHandler(({ slug, name }) => `Renamed project to ${describeProject(renameProject(slug, name))}.`)
  );

  server.registerTool(
    'remove_project',
    {
      title: 'Remove Project',
      description:
        'Unregister a project. Files on disk are left untouched. Note: a project in the default data/ location ' +
        'is re-registered automatically on the next read while its folder exists.',
      inputSchema: {
        slug: z.string().min(1).describe('Slug of the project to unregister, as shown by list_projects'),
      },
    },
    safeHandler(({ slug }) => {
      removeProject(slug);
      return `Unregistered project "${slug}". Files on disk were not touched.`;
    })
  );
}
