import type { Task, ItemStatus } from '../types.js';
import { createItem, deleteItem, findItem, listItems, updateItem } from './items.js';
import { findStory } from './stories.js';

export function createTask(project: string, story: string, title: string, notes?: string): Task {
  const parent = findStory(project, story);
  if (!parent) {
    throw new Error(`No story matching "${story}" — create it first with add_story.`);
  }
  return createItem<Task>('task', project, title, { story: parent.id }, notes);
}

export function listTasks(
  project?: string,
  status?: ItemStatus,
  limit?: number,
  story?: string
): Task[] {
  let tasks = listItems<Task>('task', project, status);
  if (story && project) {
    const parent = findStory(project, story);
    tasks = parent ? tasks.filter((t) => t.story === parent.id) : [];
  }
  return typeof limit === 'number' ? tasks.slice(0, limit) : tasks;
}

export function findTask(project: string, match: string): Task | null {
  return findItem<Task>('task', project, match);
}

export function updateTask(
  project: string,
  match: string,
  patch: { status?: ItemStatus; title?: string; notes?: string; story?: string }
): Task {
  const { story, ...rest } = patch;
  const finalPatch: Record<string, unknown> = { ...rest };
  if (story !== undefined) {
    const parent = findStory(project, story);
    if (!parent) {
      throw new Error(`No story matching "${story}" — create it first with add_story.`);
    }
    finalPatch.story = parent.id;
  }
  return updateItem<Task>('task', project, match, finalPatch);
}

export function deleteTask(project: string, match: string): string {
  const task = findTask(project, match);
  if (!task) {
    return `No task matching "${match}" found.`;
  }
  deleteItem('task', project, task.id);
  return `Deleted task "${task.title}" [${task.id}].`;
}
