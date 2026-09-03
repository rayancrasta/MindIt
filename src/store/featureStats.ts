import type { Feature, ItemStatus } from '../types.js';
import { isDoneStatus } from '../types.js';
import { listFeatures } from './features.js';
import { listStories } from './stories.js';

export interface FeatureStats {
  total: number;
  completed: number;
  complete: boolean;
}

export interface FeatureWithStats extends Feature {
  storyStats: FeatureStats;
}

export function getFeatureStats(project: string, featureId: string): FeatureStats {
  const stories = listStories(project, undefined, undefined, featureId);
  const completed = stories.filter((s) => isDoneStatus(s.status)).length;
  return { total: stories.length, completed, complete: stories.length > 0 && completed === stories.length };
}

export function listFeaturesWithStats(project?: string, status?: ItemStatus, limit?: number): FeatureWithStats[] {
  const features = listFeatures(project, status, limit);
  return features.map((f) => ({ ...f, storyStats: getFeatureStats(f.project, f.id) }));
}
