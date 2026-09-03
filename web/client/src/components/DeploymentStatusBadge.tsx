import type { DeploymentStatus } from '../api';

const COLORS: Record<DeploymentStatus, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  failed: 'bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300',
  rolled_back: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
};

const DOT: Record<DeploymentStatus, string> = {
  success: 'bg-emerald-500 dark:bg-emerald-400',
  failed: 'bg-red-500 dark:bg-red-400',
  rolled_back: 'bg-amber-500 dark:bg-amber-400',
};

const LABELS: Record<DeploymentStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  rolled_back: 'Rolled back',
};

export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}
    >
      <span className={`size-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}

/** Left-border accent color for a deployment card, matching the status badge palette. */
export const DEPLOYMENT_STATUS_BORDER: Record<DeploymentStatus, string> = {
  success: 'border-l-emerald-500 dark:border-l-emerald-400/70',
  failed: 'border-l-red-500 dark:border-l-red-400/70',
  rolled_back: 'border-l-amber-500 dark:border-l-amber-400/70',
};
