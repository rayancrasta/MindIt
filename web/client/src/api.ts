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
}

export interface Feature extends BaseItem {
  type: 'feature';
}

export interface Story extends BaseItem {
  type: 'story';
  feature: string;
  links?: string[];
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

export interface ResumeData {
  pendingFeatures: Feature[];
  pendingStories: Story[];
  pendingTasks: Task[];
  pendingBugs: Bug[];
  lastSession: SessionEntry | null;
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
  projects: () => req<string[]>('/projects'),
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
    },
  },
};
