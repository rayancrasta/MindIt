import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getFeatureStoryStats, isDone, type Bug, type Item, type ItemStatus, type ItemType, type Task } from '../api';
import { useProject } from '../context/ProjectContext';
import { KanbanBoard, type Lane } from '../components/KanbanBoard';
import { CreateItemModal } from '../components/CreateItemModal';

export function Board() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState<null | { type: ItemType; parent?: string }>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const featuresQ = useQuery({ queryKey: ['features', project], queryFn: () => api.features.list(project), enabled: !!project });
  const storiesQ = useQuery({ queryKey: ['stories', project], queryFn: () => api.stories.list(project), enabled: !!project });
  const tasksQ = useQuery({ queryKey: ['tasks', project], queryFn: () => api.tasks.list(project), enabled: !!project });
  const bugsQ = useQuery({ queryKey: ['bugs', project], queryFn: () => api.bugs.list(project), enabled: !!project });

  if (!project) {
    return <p className="text-neutral-500">Pick a project to see its board.</p>;
  }

  const features = featuresQ.data ?? [];
  const stories = storiesQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const bugs = bugsQ.data ?? [];

  async function handleDrop(item: Item, status: ItemStatus, keys: unknown[][]) {
    try {
      await api.items.update(item.id, { status });
    } finally {
      for (const key of keys) qc.invalidateQueries({ queryKey: key });
    }
  }

  async function toggleChildDone(child: Task | Bug) {
    const status = isDone(child.status) ? 'new' : 'closed';
    await api.items.update(child.id, { status });
    qc.invalidateQueries({ queryKey: ['tasks', project] });
    qc.invalidateQueries({ queryKey: ['bugs', project] });
    qc.invalidateQueries({ queryKey: ['status', project] });
    qc.invalidateQueries({ queryKey: ['resume', project] });
  }

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['features', project] });
    qc.invalidateQueries({ queryKey: ['stories', project] });
    qc.invalidateQueries({ queryKey: ['tasks', project] });
    qc.invalidateQueries({ queryKey: ['bugs', project] });
  }

  const knownFeatureIds = new Set(features.map((f) => f.id));
  const orphanStories = stories.filter((s) => !knownFeatureIds.has(s.feature));

  const childrenByParent: Record<string, (Task | Bug)[]> = {};
  for (const s of stories) {
    childrenByParent[s.id] = [...tasks.filter((t) => t.story === s.id), ...bugs.filter((b) => b.story === s.id)];
  }

  const activeFeatures = features.filter((f) => !getFeatureStoryStats(f.id, stories).complete);
  const completedFeatures = features.filter((f) => getFeatureStoryStats(f.id, stories).complete);

  const featureLane = (f: (typeof features)[number]): Lane => ({
    key: f.id,
    label: `${f.title} (#${f.id})`,
    featureId: f.id,
    items: stories.filter((s) => s.feature === f.id) as Item[],
  });

  const storyLanes: Lane[] = [
    ...activeFeatures.map(featureLane),
    ...(orphanStories.length ? [{ key: '__orphan', label: 'Other', items: orphanStories as Item[], addable: false }] : []),
  ];
  const completedLanes: Lane[] = completedFeatures.map(featureLane);

  return (
    <div>
      <KanbanBoard
        lanes={storyLanes}
        onDrop={(item, status) => handleDrop(item, status, [['stories', project]])}
        onAddToLane={(featureId) => setCreateModal({ type: 'story', parent: featureId })}
        childrenByParent={childrenByParent}
        onToggleChild={toggleChildDone}
      />
      {completedFeatures.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
            aria-expanded={showCompleted}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${showCompleted ? '' : '-rotate-90'}`}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
            <span>Show Completed ({completedFeatures.length})</span>
          </button>
          {showCompleted && (
            <div className="mt-3">
              <KanbanBoard
                lanes={completedLanes}
                onDrop={(item, status) => handleDrop(item, status, [['stories', project]])}
                onAddToLane={(featureId) => setCreateModal({ type: 'story', parent: featureId })}
                childrenByParent={childrenByParent}
                onToggleChild={toggleChildDone}
              />
            </div>
          )}
        </div>
      )}

      {createModal && (
        <CreateItemModal
          project={project}
          type={createModal.type}
          parent={createModal.parent}
          onClose={() => setCreateModal(null)}
          onCreated={() => {
            setCreateModal(null);
            invalidateAll();
          }}
        />
      )}
    </div>
  );
}
