import type { Feature, ItemStatus } from '../types.js';
import { countChildren, createItem, deleteItem, findItem, listItems, updateItem } from './items.js';

export function createFeature(project: string, title: string, notes?: string): Feature {
  return createItem<Feature>('feature', project, title, {}, notes);
}

export function listFeatures(project?: string, status?: ItemStatus, limit?: number): Feature[] {
  return listItems<Feature>('feature', project, status, limit);
}

export function findFeature(project: string, match: string): Feature | null {
  return findItem<Feature>('feature', project, match);
}

export function updateFeature(
  project: string,
  match: string,
  patch: { status?: ItemStatus; title?: string; notes?: string }
): Feature {
  return updateItem<Feature>('feature', project, match, patch);
}

export function deleteFeature(project: string, match: string, force = false): string {
  const feature = findFeature(project, match);
  if (!feature) {
    return `No feature matching "${match}" found.`;
  }
  const storyCount = countChildren('story', project, 'feature', feature.id);
  if (storyCount > 0 && !force) {
    return `Feature "${feature.title}" still has ${storyCount} stor${storyCount === 1 ? 'y' : 'ies'} attached — delete/reassign them first, or pass force: true.`;
  }
  deleteItem('feature', project, feature.id);
  return `Deleted feature "${feature.title}" [${feature.id}]${
    storyCount > 0 ? ` (${storyCount} attached stories now reference a missing feature)` : ''
  }.`;
}
