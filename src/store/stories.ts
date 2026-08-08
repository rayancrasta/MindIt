import type { Story, ItemStatus } from '../types.js';
import { countChildren, createItem, deleteItem, findItem, listItems, updateItem } from './items.js';
import { findFeature } from './features.js';

export function createStory(project: string, feature: string, title: string, notes?: string): Story {
  const parent = findFeature(project, feature);
  if (!parent) {
    throw new Error(`No feature matching "${feature}" — create it first with add_feature.`);
  }
  return createItem<Story>('story', project, title, { feature: parent.id }, notes);
}

export function listStories(
  project?: string,
  status?: ItemStatus,
  limit?: number,
  feature?: string
): Story[] {
  let stories = listItems<Story>('story', project, status);
  if (feature && project) {
    const parent = findFeature(project, feature);
    stories = parent ? stories.filter((s) => s.feature === parent.id) : [];
  }
  return typeof limit === 'number' ? stories.slice(0, limit) : stories;
}

export function findStory(project: string, match: string): Story | null {
  return findItem<Story>('story', project, match);
}

export function updateStory(
  project: string,
  match: string,
  patch: { status?: ItemStatus; title?: string; notes?: string; feature?: string }
): Story {
  const { feature, ...rest } = patch;
  const finalPatch: Record<string, unknown> = { ...rest };
  if (feature !== undefined) {
    const parent = findFeature(project, feature);
    if (!parent) {
      throw new Error(`No feature matching "${feature}" — create it first with add_feature.`);
    }
    finalPatch.feature = parent.id;
  }
  return updateItem<Story>('story', project, match, finalPatch);
}

export function deleteStory(project: string, match: string, force = false): string {
  const story = findStory(project, match);
  if (!story) {
    return `No story matching "${match}" found.`;
  }
  const taskCount = countChildren('task', project, 'story', story.id);
  const bugCount = countChildren('bug', project, 'story', story.id);
  const total = taskCount + bugCount;
  if (total > 0 && !force) {
    return `Story "${story.title}" still has ${taskCount} task(s) and ${bugCount} bug(s) attached — delete/reassign them first, or pass force: true.`;
  }
  deleteItem('story', project, story.id);
  return `Deleted story "${story.title}" [${story.id}]${
    total > 0 ? ` (${total} attached items now reference a missing story)` : ''
  }.`;
}

export function linkStories(project: string, a: string, b: string): string {
  const storyA = findStory(project, a);
  if (!storyA) return `No story matching "${a}" found.`;
  const storyB = findStory(project, b);
  if (!storyB) return `No story matching "${b}" found.`;
  if (storyA.id === storyB.id) return 'Cannot link a story to itself.';
  const linksA = Array.from(new Set([...(storyA.links ?? []), storyB.id]));
  const linksB = Array.from(new Set([...(storyB.links ?? []), storyA.id]));
  updateItem<Story>('story', project, storyA.id, { links: linksA });
  updateItem<Story>('story', project, storyB.id, { links: linksB });
  return `Linked "${storyA.title}" [${storyA.id}] <-> "${storyB.title}" [${storyB.id}].`;
}

export function unlinkStories(project: string, a: string, b: string): string {
  const storyA = findStory(project, a);
  if (!storyA) return `No story matching "${a}" found.`;
  const storyB = findStory(project, b);
  if (!storyB) return `No story matching "${b}" found.`;
  const linksA = (storyA.links ?? []).filter((id) => id !== storyB.id);
  const linksB = (storyB.links ?? []).filter((id) => id !== storyA.id);
  updateItem<Story>('story', project, storyA.id, { links: linksA });
  updateItem<Story>('story', project, storyB.id, { links: linksB });
  return `Unlinked "${storyA.title}" [${storyA.id}] from "${storyB.title}" [${storyB.id}].`;
}
