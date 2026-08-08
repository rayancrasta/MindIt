import type { Bug, ItemStatus } from '../types.js';
import { createItem, deleteItem, findItem, listItems, updateItem } from './items.js';
import { findStory } from './stories.js';

export function createBug(project: string, title: string, story?: string, notes?: string): Bug {
  const extra: Record<string, unknown> = {};
  if (story) {
    const parent = findStory(project, story);
    if (!parent) {
      throw new Error(`No story matching "${story}" — create it first with add_story.`);
    }
    extra.story = parent.id;
  }
  return createItem<Bug>('bug', project, title, extra, notes);
}

export function listBugs(
  project?: string,
  status?: ItemStatus,
  limit?: number,
  story?: string
): Bug[] {
  let bugs = listItems<Bug>('bug', project, status);
  if (story && project) {
    const parent = findStory(project, story);
    bugs = parent ? bugs.filter((b) => b.story === parent.id) : [];
  }
  return typeof limit === 'number' ? bugs.slice(0, limit) : bugs;
}

export function findBug(project: string, match: string): Bug | null {
  return findItem<Bug>('bug', project, match);
}

export function updateBug(
  project: string,
  match: string,
  patch: { status?: ItemStatus; title?: string; notes?: string; story?: string }
): Bug {
  const { story, ...rest } = patch;
  const finalPatch: Record<string, unknown> = { ...rest };
  if (story !== undefined) {
    const parent = findStory(project, story);
    if (!parent) {
      throw new Error(`No story matching "${story}" — create it first with add_story.`);
    }
    finalPatch.story = parent.id;
  }
  return updateItem<Bug>('bug', project, match, finalPatch);
}

export function deleteBug(project: string, match: string): string {
  const bug = findBug(project, match);
  if (!bug) {
    return `No bug matching "${match}" found.`;
  }
  deleteItem('bug', project, bug.id);
  return `Deleted bug "${bug.title}" [${bug.id}].`;
}
