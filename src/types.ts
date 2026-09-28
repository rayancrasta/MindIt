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
  specs?: string[];
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
  specs?: string[];
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
  specs?: string[];
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
  specs?: string[];
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

export type SpecPlatform = 'web' | 'mobile';

export const SPEC_PLATFORMS: SpecPlatform[] = ['web', 'mobile'];

export type SpecStatus = 'draft' | 'in_review' | 'approved';

export const SPEC_STATUSES: SpecStatus[] = ['draft', 'in_review', 'approved'];

export type SpecTestType = 'unit' | 'integration';

export const SPEC_TEST_TYPES: SpecTestType[] = ['unit', 'integration'];

/** A single entry/exit point on a screen — either a transition to another screen in the same platform tree, or an external trigger with no screen on the other end (app launch, push notification, deep link, etc). */
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

export interface SpecTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'page';
  title?: string;
  status?: SpecStatus;
  updated?: string;
  children?: SpecTreeNode[];
}

export interface SessionEntry {
  project: string;
  timestamp: string;
  done: string;
  blockers?: string;
  next?: string;
  items?: string[];
}

/** A resolved snapshot of an item referenced elsewhere (e.g. by a session entry), for display. */
export interface ItemRef {
  id: string;
  type: ItemType;
  title: string;
  status: ItemStatus;
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
