import type { DeploymentStatus } from '../api';

const COLORS: Record<DeploymentStatus, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30',
  failed: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300 dark:ring-red-400/30',
  rolled_back: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300 dark:ring-amber-400/30',
};

const DOT: Record<DeploymentStatus, string> = {
  success: 'bg-emerald-500',
  failed: 'bg-red-500',
  rolled_back: 'bg-amber-500',
};

const LABELS: Record<DeploymentStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  rolled_back: 'Rolled back',
};

export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${COLORS[status]}`}
    >
      <span className={`size-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}

/** Left-border accent color for a deployment card, matching the status badge palette. */
export const DEPLOYMENT_STATUS_BORDER: Record<DeploymentStatus, string> = {
  success: 'border-l-emerald-500',
  failed: 'border-l-red-500',
  rolled_back: 'border-l-amber-500',
};
