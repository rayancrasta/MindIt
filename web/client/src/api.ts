export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type ItemStatus = 'new' | 'in_progress' | 'testing' | 'resolved' | 'closed';
export const ITEM_STATUSES: ItemStatus[] = ['new', 'in_progress', 'testing', 'resolved', 'closed'];

/** Resolved and closed both read as "done" for checkbox/checklist purposes. */
export function isDone(status: ItemStatus): boolean {
  return status === 'resolved' || status === 'closed';
}

export type ItemType = 'feature' | 'story' | 'task' | 'bug';
export const ITEM_TYPES: ItemType[] = ['feature', 'story', 'task', 'bug'];

export interface Comment {
  id: string;
  author: string;
  text: string;
  created: string;
  updated?: string;
}

interface BaseItem {
  id: string;
  project: string;
  title: string;
  status: ItemStatus;
  created: string;
  updated: string;
  notes?: string;
  comments?: Comment[];
  specs?: string[];
}

export interface Feature extends BaseItem {
  type: 'feature';
}

export interface Story extends BaseItem {
  type: 'story';
  feature: string;
  links?: string[];
}

export interface FeatureStoryStats {
  total: number;
  completed: number;
  complete: boolean;
}

/** A feature is complete when it has at least one story and all of them are done. */
export function getFeatureStoryStats(featureId: string, stories: Story[]): FeatureStoryStats {
  const own = stories.filter((s) => s.feature === featureId);
  const completed = own.filter((s) => isDone(s.status)).length;
  return { total: own.length, completed, complete: own.length > 0 && completed === own.length };
}

export interface Task extends BaseItem {
  type: 'task';
  story: string;
}

export interface Bug extends BaseItem {
  type: 'bug';
  story?: string;
}

export type Item = Feature | Story | Task | Bug;

export interface SessionEntry {
  project: string;
  timestamp: string;
  done: string;
  blockers?: string;
  next?: string;
}

export interface WikiPage {
  path: string;
  title: string;
  content: string;
  created: string;
  updated: string;
}

export interface WikiTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'page';
  title?: string;
  updated?: string;
  children?: WikiTreeNode[];
}

export interface WikiFolderListing {
  folders: string[];
  pages: { path: string; title: string; updated: string }[];
}

export type DeploymentStatus = 'success' | 'failed' | 'rolled_back';
export const DEPLOYMENT_STATUSES: DeploymentStatus[] = ['success', 'failed', 'rolled_back'];

export interface DeploymentNote {
  id: string;
  project: string;
  commitHash: string;
  environment: string;
  status: DeploymentStatus;
  deployedBy: string;
  timestamp: string;
  notes?: string;
  created: string;
  updated: string;
}

export type DiagramKind = 'sequence' | 'mermaid';
export const DIAGRAM_KINDS: DiagramKind[] = ['sequence', 'mermaid'];

export interface Diagram {
  path: string;
  title: string;
  kind: DiagramKind;
  content: string;
  created: string;
  updated: string;
}

export interface DiagramTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'page';
  title?: string;
  kind?: DiagramKind;
  updated?: string;
  children?: DiagramTreeNode[];
}

export interface DiagramFolderListing {
  folders: string[];
  pages: { path: string; title: string; kind: DiagramKind; updated: string }[];
}

export interface SchemaForeignKey {
  table: string;
  column: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  foreignKey?: SchemaForeignKey;
}

export interface SchemaTable {
  path: string;
  title: string;
  description: string;
  columns: SchemaColumn[];
  created: string;
  updated: string;
}

export interface SchemaTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'page';
  title?: string;
  updated?: string;
  children?: SchemaTreeNode[];
}

export interface SchemaFolderListing {
  folders: string[];
  pages: { path: string; title: string; updated: string }[];
}

export type SpecPlatform = 'web' | 'mobile';
export const SPEC_PLATFORMS: SpecPlatform[] = ['web', 'mobile'];

export type SpecStatus = 'draft' | 'in_review' | 'approved';
export const SPEC_STATUSES: SpecStatus[] = ['draft', 'in_review', 'approved'];

export type SpecTestType = 'unit' | 'integration';
export const SPEC_TEST_TYPES: SpecTestType[] = ['unit', 'integration'];

export interface SpecTransition {
  label: string;
  target?: string;
  external?: string;
}

export interface SpecTestCase {
  type: SpecTestType;
  description: string;
}

export interface SpecScreen {
  path: string;
  title: string;
  platform: SpecPlatform;
  designUrl?: string;
  status: SpecStatus;
  tags?: string[];
  entryPoints: SpecTransition[];
  exitPoints: SpecTransition[];
  acceptanceCriteria?: string[];
  testCases?: SpecTestCase[];
  codeRefs?: string[];
  dataRefs?: string[];
  description: string;
  created: string;
  updated: string;
}

export interface SpecLinkInput {
  from: string;
  to: string;
  label: string;
  backLabel?: string;
}

export interface SpecLinkResult {
  from: SpecScreen;
  to: SpecScreen;
}

export interface SpecTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'page';
  title?: string;
  status?: SpecStatus;
  updated?: string;
  children?: SpecTreeNode[];
}

export interface SpecFolderListing {
  folders: string[];
  pages: { path: string; title: string; status: SpecStatus; updated: string }[];
}

export interface ProjectMeta {
  slug: string;
  name: string;
  /** Absolute path holding this project's files, or null for the default location inside data/. */
  path: string | null;
  created: string;
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  directories: string[];
}

export interface ResumeData {
  pendingFeatures: Feature[];
  pendingStories: Story[];
  pendingTasks: Task[];
  pendingBugs: Bug[];
  lastSession: SessionEntry | null;
  lastDeployment: DeploymentNote | null;
}

export type StatusCounts = Record<ItemType, Record<string, number>>;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const BASE = '/api';

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body && (body.error || body.message)) || res.statusText;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export const api = {
  projects: {
    list: () => req<ProjectMeta[]>('/projects'),
    create: (data: { name: string; path?: string }) =>
      req<ProjectMeta>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    rename: (slug: string, name: string) =>
      req<ProjectMeta>(`/projects/${encodeURIComponent(slug)}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    remove: (slug: string) =>
      req<{ message: string }>(`/projects/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  },
  fs: {
    browse: (dirPath?: string) => req<BrowseResult>(`/fs/browse${qs({ path: dirPath })}`),
  },
  status: (project: string) => req<StatusCounts>(`/status${qs({ project })}`),
  resume: (project: string) => req<ResumeData>(`/resume${qs({ project })}`),

  features: {
    list: (project?: string, status?: ItemStatus) => req<Feature[]>(`/features${qs({ project, status })}`),
    create: (data: { project: string; title: string; notes?: string }) =>
      req<Feature>('/features', { method: 'POST', body: JSON.stringify(data) }),
  },
  stories: {
    list: (project?: string, status?: ItemStatus, feature?: string) =>
      req<Story[]>(`/stories${qs({ project, status, feature })}`),
    create: (data: { project: string; feature: string; title: string; notes?: string }) =>
      req<Story>('/stories', { method: 'POST', body: JSON.stringify(data) }),
    link: (id: string, other: string) =>
      req<{ message: string }>(`/stories/${id}/link`, { method: 'POST', body: JSON.stringify({ other }) }),
    unlink: (id: string, other: string) =>
      req<{ message: string }>(`/stories/${id}/link/${other}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (project?: string, status?: ItemStatus, story?: string) =>
      req<Task[]>(`/tasks${qs({ project, status, story })}`),
    create: (data: { project: string; story: string; title: string; notes?: string }) =>
      req<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  },
  bugs: {
    list: (project?: string, status?: ItemStatus, story?: string) =>
      req<Bug[]>(`/bugs${qs({ project, status, story })}`),
    create: (data: { project: string; title: string; story?: string; notes?: string }) =>
      req<Bug>('/bugs', { method: 'POST', body: JSON.stringify(data) }),
  },
  items: {
    get: (id: string) => req<{ type: ItemType; project: string; item: Item }>(`/items/${id}`),
    update: (
      id: string,
      patch: Partial<{ status: ItemStatus; title: string; notes: string; feature: string; story: string }>
    ) => req<{ type: ItemType; project: string; item: Item }>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id: string, force?: boolean) =>
      req<{ message: string }>(`/items/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
    comments: {
      add: (id: string, data: { text: string; author?: string }) =>
        req<Item>(`/items/${id}/comments`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, commentId: string, text: string) =>
        req<Item>(`/items/${id}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ text }) }),
      remove: (id: string, commentId: string) =>
        req<Item>(`/items/${id}/comments/${commentId}`, { method: 'DELETE' }),
    },
    specs: {
      link: (id: string, platform: SpecPlatform, path: string) =>
        req<Item>(`/items/${id}/specs/link`, { method: 'POST', body: JSON.stringify({ platform, path }) }),
      unlink: (id: string, platform: SpecPlatform, path: string) =>
        req<Item>(`/items/${id}/specs/link${qs({ platform, path })}`, { method: 'DELETE' }),
    },
  },
  log: {
    list: (project: string, limit?: number) =>
      req<SessionEntry[]>(`/projects/${encodeURIComponent(project)}/log${limit ? `?limit=${limit}` : ''}`),
    append: (project: string, entry: { done: string; blockers?: string; next?: string }) =>
      req<{ timestamp: string }>(`/projects/${encodeURIComponent(project)}/log`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },
  wiki: {
    tree: (project: string, folder?: string) =>
      req<WikiFolderListing>(`/projects/${encodeURIComponent(project)}/wiki/tree${qs({ folder })}`),
    fullTree: (project: string, folder?: string) =>
      req<WikiTreeNode[]>(
        `/projects/${encodeURIComponent(project)}/wiki/tree${qs({ folder, recursive: 'true' })}`
      ),
    page: {
      get: (project: string, path: string) =>
        req<WikiPage>(`/projects/${encodeURIComponent(project)}/wiki/page${qs({ path })}`),
      create: (project: string, data: { path: string; content?: string; title?: string }) =>
        req<WikiPage>(`/projects/${encodeURIComponent(project)}/wiki/page`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (project: string, path: string, content: string) =>
        req<WikiPage>(`/projects/${encodeURIComponent(project)}/wiki/page`, {
          method: 'PUT',
          body: JSON.stringify({ path, content }),
        }),
      append: (project: string, path: string, content: string) =>
        req<WikiPage>(`/projects/${encodeURIComponent(project)}/wiki/page`, {
          method: 'PATCH',
          body: JSON.stringify({ path, content }),
        }),
      remove: (project: string, path: string) =>
        req<WikiPage>(`/projects/${encodeURIComponent(project)}/wiki/page${qs({ path })}`, { method: 'DELETE' }),
      move: (project: string, from: string, to: string) =>
        req<WikiPage>(`/projects/${encodeURIComponent(project)}/wiki/page/move`, {
          method: 'POST',
          body: JSON.stringify({ from, to }),
        }),
    },
    folder: {
      create: (project: string, path: string) =>
        req<{ path: string }>(`/projects/${encodeURIComponent(project)}/wiki/folder`, {
          method: 'POST',
          body: JSON.stringify({ path }),
        }),
      remove: (project: string, path: string) =>
        req<{ path: string }>(`/projects/${encodeURIComponent(project)}/wiki/folder${qs({ path })}`, {
          method: 'DELETE',
        }),
      move: (project: string, from: string, to: string) =>
        req<{ path: string }>(`/projects/${encodeURIComponent(project)}/wiki/folder/move`, {
          method: 'POST',
          body: JSON.stringify({ from, to }),
        }),
    },
  },
  deployments: {
    list: (project?: string, environment?: string, status?: DeploymentStatus) =>
      req<DeploymentNote[]>(`/deployments${qs({ project, environment, status })}`),
    create: (data: {
      project: string;
      commitHash: string;
      environment?: string;
      status?: DeploymentStatus;
      deployedBy?: string;
      timestamp?: string;
      notes?: string;
    }) => req<DeploymentNote>('/deployments', { method: 'POST', body: JSON.stringify(data) }),
    get: (project: string, id: string) => req<DeploymentNote>(`/deployments/${id}${qs({ project })}`),
    update: (
      project: string,
      id: string,
      patch: Partial<{
        commitHash: string;
        environment: string;
        status: DeploymentStatus;
        deployedBy: string;
        timestamp: string;
        notes: string;
      }>
    ) => req<DeploymentNote>(`/deployments/${id}${qs({ project })}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (project: string, id: string) =>
      req<{ message: string }>(`/deployments/${id}${qs({ project })}`, { method: 'DELETE' }),
  },
  diagrams: {
    tree: (project: string, folder?: string, kind?: DiagramKind) =>
      req<DiagramFolderListing>(`/projects/${encodeURIComponent(project)}/diagrams/tree${qs({ folder, kind })}`),
    fullTree: (project: string, folder?: string, kind?: DiagramKind) =>
      req<DiagramTreeNode[]>(
        `/projects/${encodeURIComponent(project)}/diagrams/tree${qs({ folder, kind, recursive: 'true' })}`
      ),
    page: {
      get: (project: string, path: string) =>
        req<Diagram>(`/projects/${encodeURIComponent(project)}/diagrams/page${qs({ path })}`),
      create: (project: string, data: { path: string; content?: string; title?: string }) =>
        req<Diagram>(`/projects/${encodeURIComponent(project)}/diagrams/page`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (project: string, path: string, content: string) =>
        req<Diagram>(`/projects/${encodeURIComponent(project)}/diagrams/page`, {
          method: 'PUT',
          body: JSON.stringify({ path, content }),
        }),
      remove: (project: string, path: string) =>
        req<Diagram>(`/projects/${encodeURIComponent(project)}/diagrams/page${qs({ path })}`, { method: 'DELETE' }),
    },
  },
  schemas: {
    tree: (project: string, folder?: string) =>
      req<SchemaFolderListing>(`/projects/${encodeURIComponent(project)}/schemas/tree${qs({ folder })}`),
    fullTree: (project: string, folder?: string) =>
      req<SchemaTreeNode[]>(
        `/projects/${encodeURIComponent(project)}/schemas/tree${qs({ folder, recursive: 'true' })}`
      ),
    erd: (project: string, folder?: string) =>
      req<{ mermaid: string }>(`/projects/${encodeURIComponent(project)}/schemas/erd${qs({ folder })}`),
    tables: (project: string, folder?: string) =>
      req<SchemaTable[]>(`/projects/${encodeURIComponent(project)}/schemas/tables${qs({ folder })}`),
    table: {
      get: (project: string, path: string) =>
        req<SchemaTable>(`/projects/${encodeURIComponent(project)}/schemas/table${qs({ path })}`),
      create: (project: string, data: { path: string; columns?: SchemaColumn[]; description?: string; title?: string }) =>
        req<SchemaTable>(`/projects/${encodeURIComponent(project)}/schemas/table`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (project: string, path: string, columns: SchemaColumn[], description: string) =>
        req<SchemaTable>(`/projects/${encodeURIComponent(project)}/schemas/table`, {
          method: 'PUT',
          body: JSON.stringify({ path, columns, description }),
        }),
      remove: (project: string, path: string) =>
        req<SchemaTable>(`/projects/${encodeURIComponent(project)}/schemas/table${qs({ path })}`, { method: 'DELETE' }),
    },
  },
  specs: {
    tree: (project: string, platform: SpecPlatform, folder?: string) =>
      req<SpecFolderListing>(`/projects/${encodeURIComponent(project)}/specs/${platform}/tree${qs({ folder })}`),
    fullTree: (project: string, platform: SpecPlatform, folder?: string) =>
      req<SpecTreeNode[]>(
        `/projects/${encodeURIComponent(project)}/specs/${platform}/tree${qs({ folder, recursive: 'true' })}`
      ),
    journey: (project: string, platform: SpecPlatform, folder?: string) =>
      req<{ mermaid: string }>(`/projects/${encodeURIComponent(project)}/specs/${platform}/journey${qs({ folder })}`),
    screens: (project: string, platform: SpecPlatform, folder?: string) =>
      req<SpecScreen[]>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screens${qs({ folder })}`),
    screen: {
      get: (project: string, platform: SpecPlatform, path: string) =>
        req<SpecScreen>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screen${qs({ path })}`),
      references: (project: string, platform: SpecPlatform, path: string) =>
        req<Item[]>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screen/references${qs({ path })}`),
      create: (
        project: string,
        platform: SpecPlatform,
        data: { path: string } & Partial<Omit<SpecScreen, 'path' | 'platform' | 'created' | 'updated'>>
      ) =>
        req<SpecScreen>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screen`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (
        project: string,
        platform: SpecPlatform,
        path: string,
        data: Partial<Omit<SpecScreen, 'path' | 'platform' | 'created' | 'updated'>>
      ) =>
        req<SpecScreen>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screen`, {
          method: 'PUT',
          body: JSON.stringify({ path, ...data }),
        }),
      remove: (project: string, platform: SpecPlatform, path: string) =>
        req<SpecScreen>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screen${qs({ path })}`, {
          method: 'DELETE',
        }),
    },
    transition: {
      set: (project: string, platform: SpecPlatform, path: string, direction: 'entry' | 'exit', transition: SpecTransition) =>
        req<SpecScreen>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screen/transition`, {
          method: 'PUT',
          body: JSON.stringify({ path, direction, transition }),
        }),
      remove: (project: string, platform: SpecPlatform, path: string, direction: 'entry' | 'exit', label: string) =>
        req<SpecScreen>(
          `/projects/${encodeURIComponent(project)}/specs/${platform}/screen/transition${qs({ path, direction, label })}`,
          { method: 'DELETE' }
        ),
    },
    link: {
      /** Links two screens across journeys/folders in one call: an exit point on `from` targeting `to`, and a matching entry point back on `to`. */
      create: (project: string, platform: SpecPlatform, input: SpecLinkInput) =>
        req<SpecLinkResult>(`/projects/${encodeURIComponent(project)}/specs/${platform}/screen/link`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      /** Removes a link created by link.create from both sides. */
      remove: (project: string, platform: SpecPlatform, input: SpecLinkInput) =>
        req<SpecLinkResult>(
          `/projects/${encodeURIComponent(project)}/specs/${platform}/screen/link${qs({
            from: input.from,
            to: input.to,
            label: input.label,
            backLabel: input.backLabel,
          })}`,
          { method: 'DELETE' }
        ),
    },
  },
};
