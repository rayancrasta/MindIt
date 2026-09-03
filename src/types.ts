export type ItemStatus = 'new' | 'in_progress' | 'testing' | 'resolved' | 'closed';

export const ITEM_STATUSES: ItemStatus[] = ['new', 'in_progress', 'testing', 'resolved', 'closed'];

/** Resolved and closed both read as "done" for completion/checklist purposes. */
export function isDoneStatus(status: ItemStatus): boolean {
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

export interface Feature {
  id: string;
  type: 'feature';
  project: string;
  title: string;
  status: ItemStatus;
  created: string;
  updated: string;
  notes?: string;
  comments?: Comment[];
}

export interface Story {
  id: string;
  type: 'story';
  project: string;
  feature: string;
  title: string;
  status: ItemStatus;
  created: string;
  updated: string;
  notes?: string;
  links?: string[];
  comments?: Comment[];
}

export interface Task {
  id: string;
  type: 'task';
  project: string;
  story: string;
  title: string;
  status: ItemStatus;
  created: string;
  updated: string;
  notes?: string;
  comments?: Comment[];
}

export interface Bug {
  id: string;
  type: 'bug';
  project: string;
  story?: string;
  title: string;
  status: ItemStatus;
  created: string;
  updated: string;
  notes?: string;
  comments?: Comment[];
}

export type Item = Feature | Story | Task | Bug;

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

export interface SessionEntry {
  project: string;
  timestamp: string;
  done: string;
  blockers?: string;
  next?: string;
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
