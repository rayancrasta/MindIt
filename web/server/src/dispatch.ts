import type { Item, ItemStatus, ItemType } from '../../../src/types.js';
import { updateFeature, deleteFeature } from '../../../src/store/features.js';
import { updateStory, deleteStory } from '../../../src/store/stories.js';
import { updateTask, deleteTask } from '../../../src/store/tasks.js';
import { updateBug, deleteBug } from '../../../src/store/bugs.js';

export interface GenericPatch {
  status?: ItemStatus;
  title?: string;
  notes?: string;
  feature?: string;
  story?: string;
}

export function updateByType(type: ItemType, project: string, id: string, patch: GenericPatch): Item {
  const { status, title, notes, feature, story } = patch;
  switch (type) {
    case 'feature':
      return updateFeature(project, id, { status, title, notes });
    case 'story':
      return updateStory(project, id, { status, title, notes, feature });
    case 'task':
      return updateTask(project, id, { status, title, notes, story });
    case 'bug':
      return updateBug(project, id, { status, title, notes, story });
  }
}

export function deleteByType(type: ItemType, project: string, id: string, force: boolean): string {
  switch (type) {
    case 'feature':
      return deleteFeature(project, id, force);
    case 'story':
      return deleteStory(project, id, force);
    case 'task':
      return deleteTask(project, id);
    case 'bug':
      return deleteBug(project, id);
  }
}
