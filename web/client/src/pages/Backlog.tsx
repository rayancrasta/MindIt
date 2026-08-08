import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isDone, type Bug, type ItemType, type Task } from '../api';
import { useProject } from '../context/ProjectContext';
import { StatusBadge } from '../components/StatusBadge';
import { ItemTypeBadge } from '../components/ItemTypeBadge';
import { CreateItemModal } from '../components/CreateItemModal';
import { TaskCheckbox } from '../components/TaskCheckbox';

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function Backlog() {
  const { project } = useProject();
  const qc = useQueryClient();
  const [openFeatures, setOpenFeatures] = useState<Set<string>>(new Set());
  const [openStories, setOpenStories] = useState<Set<string>>(new Set());
  const [createModal, setCreateModal] = useState<null | { type: ItemType; parent?: string }>(null);

  const featuresQ = useQuery({ queryKey: ['features', project], queryFn: () => api.features.list(project), enabled: !!project });
  const storiesQ = useQuery({ queryKey: ['stories', project], queryFn: () => api.stories.list(project), enabled: !!project });
  const tasksQ = useQuery({ queryKey: ['tasks', project], queryFn: () => api.tasks.list(project), enabled: !!project });
  const bugsQ = useQuery({ queryKey: ['bugs', project], queryFn: () => api.bugs.list(project), enabled: !!project });

  if (!project) {
    return <p className="text-slate-500">Use "+ Project" in the header to start your first project.</p>;
  }

  const features = featuresQ.data ?? [];
  const stories = storiesQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const bugs = bugsQ.data ?? [];

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['projects'] });
    qc.invalidateQueries({ queryKey: ['features', project] });
    qc.invalidateQueries({ queryKey: ['stories', project] });
    qc.invalidateQueries({ queryKey: ['tasks', project] });
    qc.invalidateQueries({ queryKey: ['bugs', project] });
    qc.invalidateQueries({ queryKey: ['status', project] });
    qc.invalidateQueries({ queryKey: ['resume', project] });
  }

  async function toggleDone(item: Task | Bug) {
    const status = isDone(item.status) ? 'new' : 'closed';
    await api.items.update(item.id, { status });
    invalidateAll();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Backlog — {project}</h2>
        <button onClick={() => setCreateModal({ type: 'feature' })} className="btn-primary">
          + New feature
        </button>
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {features.length === 0 && <p className="p-4 text-sm text-slate-400">No features yet.</p>}
        {features.map((f) => {
          const fStories = stories.filter((s) => s.feature === f.id);
          const isOpen = openFeatures.has(f.id);
          return (
            <div key={f.id}>
              <div className="flex items-center gap-2 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button
                  onClick={() => setOpenFeatures((s) => toggle(s, f.id))}
                  className="flex w-4 shrink-0 items-center justify-center text-slate-400 transition-transform"
                  style={{ transform: isOpen ? 'rotate(90deg)' : undefined }}
                >
                  ▸
                </button>
                <ItemTypeBadge type="feature" id={f.id} />
                <Link to={`/item/${f.id}`} className="flex-1 truncate font-medium hover:underline">
                  {f.title}
                </Link>
                <StatusBadge status={f.status} />
                <button onClick={() => setCreateModal({ type: 'story', parent: f.id })} className="btn-link">
                  + story
                </button>
              </div>
              {isOpen && (
                <div className="ml-8 border-t border-slate-100 dark:border-slate-800">
                  {fStories.length === 0 && <p className="p-3 text-sm text-slate-400">No stories yet.</p>}
                  {fStories.map((s) => {
                    const sTasks = tasks.filter((t) => t.story === s.id);
                    const sBugs = bugs.filter((b) => b.story === s.id);
                    const sChildren: (Task | Bug)[] = [...sTasks, ...sBugs];
                    const sDone = sChildren.filter((c) => isDone(c.status)).length;
                    const sOpen = openStories.has(s.id);
                    return (
                      <div key={s.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                        <div className="flex items-center gap-2 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <button
                            onClick={() => setOpenStories((st) => toggle(st, s.id))}
                            className="flex w-4 shrink-0 items-center justify-center text-slate-400 transition-transform"
                            style={{ transform: sOpen ? 'rotate(90deg)' : undefined }}
                          >
                            ▸
                          </button>
                          <ItemTypeBadge type="story" id={s.id} />
                          <Link to={`/item/${s.id}`} className="flex-1 truncate hover:underline">
                            {s.title}
                          </Link>
                          {sChildren.length > 0 && (
                            <span className="text-xs text-slate-400">
                              {sDone}/{sChildren.length}
                            </span>
                          )}
                          <StatusBadge status={s.status} />
                          <button onClick={() => setCreateModal({ type: 'task', parent: s.id })} className="btn-link">
                            + task
                          </button>
                          <button onClick={() => setCreateModal({ type: 'bug', parent: s.id })} className="btn-link">
                            + bug
                          </button>
                        </div>
                        {sOpen && (
                          <div className="ml-8 space-y-1 border-t border-slate-100 p-2 dark:border-slate-800">
                            {[...sTasks, ...sBugs].length === 0 && (
                              <p className="p-1 text-sm text-slate-400">No tasks or bugs yet.</p>
                            )}
                            {sTasks.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <TaskCheckbox checked={isDone(t.status)} onToggle={() => toggleDone(t)} />
                                <ItemTypeBadge type="task" id={t.id} />
                                <Link
                                  to={`/item/${t.id}`}
                                  className={`flex-1 truncate hover:underline ${isDone(t.status) ? 'text-slate-400 line-through' : ''}`}
                                >
                                  {t.title}
                                </Link>
                                <StatusBadge status={t.status} />
                              </div>
                            ))}
                            {sBugs.map((b) => (
                              <div
                                key={b.id}
                                className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <TaskCheckbox checked={isDone(b.status)} onToggle={() => toggleDone(b)} />
                                <ItemTypeBadge type="bug" id={b.id} />
                                <Link
                                  to={`/item/${b.id}`}
                                  className={`flex-1 truncate hover:underline ${isDone(b.status) ? 'text-slate-400 line-through' : ''}`}
                                >
                                  {b.title}
                                </Link>
                                <StatusBadge status={b.status} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StandaloneBugs bugs={bugs.filter((b) => !b.story)} onToggle={toggleDone} onCreate={() => setCreateModal({ type: 'bug' })} />

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

function StandaloneBugs({
  bugs,
  onToggle,
  onCreate,
}: {
  bugs: Bug[];
  onToggle: (bug: Bug) => void | Promise<void>;
  onCreate: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-500">Standalone bugs</h3>
        <button onClick={onCreate} className="btn-link">
          + bug
        </button>
      </div>
      <div className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {bugs.length === 0 && <p className="p-3 text-sm text-slate-400">None.</p>}
        {bugs.map((b) => (
          <div key={b.id} className="flex items-center gap-2 p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <TaskCheckbox checked={isDone(b.status)} onToggle={async () => onToggle(b)} />
            <ItemTypeBadge type="bug" id={b.id} />
            <Link
              to={`/item/${b.id}`}
              className={`flex-1 truncate hover:underline ${isDone(b.status) ? 'text-slate-400 line-through' : ''}`}
            >
              {b.title}
            </Link>
            <StatusBadge status={b.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
