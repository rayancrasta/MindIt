import type { ItemStatus } from '../api';

const COLORS: Record<ItemStatus, string> = {
  new: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300 dark:ring-slate-400/20',
  in_progress: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300 dark:ring-blue-400/30',
  testing: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300 dark:ring-amber-400/30',
  resolved: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30',
  closed: 'bg-slate-500/15 text-slate-500 ring-slate-500/20 dark:text-slate-400 dark:ring-slate-400/20',
};

const DOT: Record<ItemStatus, string> = {
  new: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  testing: 'bg-amber-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-slate-400',
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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${COLORS[status]}`}
    >
      <span className={`size-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
