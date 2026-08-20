import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, ITEM_STATUSES, type Item, type ItemType } from '../api';
import { useProject } from '../context/ProjectContext';
import { StatusBadge } from '../components/StatusBadge';
import { DeploymentStatusBadge } from '../components/DeploymentStatusBadge';
import { EnvironmentBadge } from '../components/EnvironmentBadge';

const TYPE_LABELS: Record<ItemType, string> = { feature: 'Features', story: 'Stories', task: 'Tasks', bug: 'Bugs' };
const TYPES: ItemType[] = ['feature', 'story', 'task', 'bug'];
const TYPE_ACCENT: Record<ItemType, string> = {
  feature: 'before:bg-purple-500',
  story: 'before:bg-sky-500',
  task: 'before:bg-amber-500',
  bug: 'before:bg-red-500',
};

export function Dashboard() {
  const { project } = useProject();

  const statusQ = useQuery({
    queryKey: ['status', project],
    queryFn: () => api.status(project!),
    enabled: !!project,
  });
  const resumeQ = useQuery({
    queryKey: ['resume', project],
    queryFn: () => api.resume(project!),
    enabled: !!project,
  });

  if (!project) {
    return <p className="text-slate-500">Pick a project to see its dashboard, or create one from the Backlog page.</p>;
  }

  const counts = statusQ.data;
  const resume = resumeQ.data;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Status — {project}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((t) => {
            const total = ITEM_STATUSES.reduce((sum, s) => sum + (counts?.[t]?.[s] ?? 0), 0);
            return (
              <div
                key={t}
                className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 pt-4 shadow-sm transition-shadow before:absolute before:inset-x-0 before:top-0 before:h-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${TYPE_ACCENT[t]}`}
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{TYPE_LABELS[t]}</h3>
                  <span className="text-lg font-semibold tabular-nums text-slate-400 dark:text-slate-500">{total}</span>
                </div>
                <ul className="space-y-1">
                  {ITEM_STATUSES.map((s) => (
                    <li key={s} className="flex items-center justify-between text-sm">
                      <StatusBadge status={s} />
                      <span className="font-mono tabular-nums">{counts?.[t]?.[s] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {resume && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Pending work</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PendingList title="Features" items={resume.pendingFeatures} />
            <PendingList title="Stories" items={resume.pendingStories} />
            <PendingList title="Tasks" items={resume.pendingTasks} />
            <PendingList title="Bugs" items={resume.pendingBugs} />
          </div>
        </section>
      )}

      {resume?.lastSession && (
        <section>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Last session</h2>
          <div className="card p-3 text-sm">
            <p className="mb-2 text-xs text-slate-400">{new Date(resume.lastSession.timestamp).toLocaleString()}</p>
            <p className="mb-1">
              <span className="font-medium text-slate-600 dark:text-slate-300">Done:</span> {resume.lastSession.done}
            </p>
            {resume.lastSession.blockers && (
              <p className="mb-1">
                <span className="font-medium text-slate-600 dark:text-slate-300">Blockers:</span>{' '}
                {resume.lastSession.blockers}
              </p>
            )}
            {resume.lastSession.next && (
              <p>
                <span className="font-medium text-slate-600 dark:text-slate-300">Next:</span> {resume.lastSession.next}
              </p>
            )}
          </div>
        </section>
      )}

      {resume?.lastDeployment && (
        <section>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Last deployment</h2>
          <div className="card p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium dark:bg-slate-800">
                {resume.lastDeployment.commitHash}
              </code>
              <EnvironmentBadge environment={resume.lastDeployment.environment} />
              <DeploymentStatusBadge status={resume.lastDeployment.status} />
              <span className="ml-auto text-xs text-slate-400">
                {new Date(resume.lastDeployment.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-400">by {resume.lastDeployment.deployedBy}</p>
          </div>
        </section>
      )}
    </div>
  );
}

function PendingList({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="card p-3 transition-shadow hover:shadow-md">
      <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        {title} <span className="font-normal text-slate-400">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing pending.</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 6).map((i) => (
            <li key={i.id}>
              <Link to={`/item/${i.id}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                #{i.id} {i.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
