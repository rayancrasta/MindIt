import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getFeatureStoryStats, isDone, type Bug, type Item, type ItemStatus, type ItemType, type Task } from '../api';
import { useProject } from '../context/ProjectContext';
import { KanbanBoard, type Lane } from '../components/KanbanBoard';
import { CreateItemModal } from '../components/CreateItemModal';

type BoardMode = 'stories' | 'tasks';

export function Board() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [mode, setMode] = useState<BoardMode>('stories');
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<null | { type: ItemType; parent?: string }>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const featuresQ = useQuery({ queryKey: ['features', project], queryFn: () => api.features.list(project), enabled: !!project });
  const storiesQ = useQuery({ queryKey: ['stories', project], queryFn: () => api.stories.list(project), enabled: !!project });
  const tasksQ = useQuery({ queryKey: ['tasks', project], queryFn: () => api.tasks.list(project), enabled: !!project });
  const bugsQ = useQuery({ queryKey: ['bugs', project], queryFn: () => api.bugs.list(project), enabled: !!project });

  if (!project) {
    return <p className="text-slate-500">Pick a project to see its board.</p>;
  }

  const features = featuresQ.data ?? [];
  const stories = storiesQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const bugs = bugsQ.data ?? [];

  const story = stories.find((s) => s.id === selectedStory) ?? null;
  const scopedItems: Item[] = story
    ? [...tasks.filter((t) => t.story === story.id), ...bugs.filter((b) => b.story === story.id)]
    : [];

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
    items: stories.filter((s) => s.feature === f.id) as Item[],
  });

  const storyLanes: Lane[] = [
    ...activeFeatures.map(featureLane),
    ...(orphanStories.length ? [{ key: '__orphan', label: 'Other', items: orphanStories as Item[], addable: false }] : []),
  ];
  const completedLanes: Lane[] = completedFeatures.map(featureLane);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Board — {project}</h2>
        <div className="flex overflow-hidden rounded-full border border-slate-300 bg-white p-0.5 text-sm dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => setMode('stories')}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              mode === 'stories' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Stories
          </button>
          <button
            onClick={() => setMode('tasks')}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              mode === 'tasks' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Tasks &amp; Bugs
          </button>
        </div>
        {mode === 'tasks' && (
          <select
            value={selectedStory ?? ''}
            onChange={(e) => setSelectedStory(e.target.value || null)}
            className="input w-auto py-1"
          >
            <option value="">Select a story…</option>
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.id} {s.title}
              </option>
            ))}
          </select>
        )}
        {mode === 'tasks' && story && (
          <div className="flex gap-2">
            <button onClick={() => setCreateModal({ type: 'task', parent: story.id })} className="btn-secondary">
              + task
            </button>
            <button onClick={() => setCreateModal({ type: 'bug', parent: story.id })} className="btn-secondary">
              + bug
            </button>
          </div>
        )}
      </div>

      {mode === 'stories' ? (
        <>
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
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
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
        </>
      ) : story ? (
        <KanbanBoard
          lanes={[{ key: story.id, label: `${story.title} (#${story.id})`, items: scopedItems, addable: false, defaultCollapsed: false }]}
          onDrop={(item, status) => handleDrop(item, status, [['tasks', project], ['bugs', project]])}
          onToggleItem={toggleChildDone}
        />
      ) : (
        <p className="text-slate-500">Pick a story above to see its task/bug board.</p>
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
