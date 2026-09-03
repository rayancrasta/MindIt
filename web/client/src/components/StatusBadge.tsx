import type { ItemStatus } from '../api';

const COLORS: Record<ItemStatus, string> = {
  new: 'bg-neutral-500/10 text-neutral-600 dark:bg-neutral-400/10 dark:text-neutral-400',
  in_progress: 'bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300',
  testing: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  resolved: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  closed: 'bg-neutral-500/10 text-neutral-500 dark:bg-neutral-400/10 dark:text-neutral-500',
};

const DOT: Record<ItemStatus, string> = {
  new: 'bg-neutral-400 dark:bg-neutral-500',
  in_progress: 'bg-blue-500 dark:bg-blue-400',
  testing: 'bg-amber-500 dark:bg-amber-400',
  resolved: 'bg-emerald-500 dark:bg-emerald-400',
  closed: 'bg-neutral-400 dark:bg-neutral-600',
};

const LABELS: Record<ItemStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  testing: 'Testing',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}
    >
      <span className={`size-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
