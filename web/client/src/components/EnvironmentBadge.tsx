const KNOWN_COLORS: Record<string, string> = {
  production: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300',
  staging: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  development: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
  preview: 'bg-purple-500/10 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300',
};

const FALLBACK_COLOR = 'bg-neutral-500/10 text-neutral-600 dark:bg-neutral-400/10 dark:text-neutral-400';

export function EnvironmentBadge({ environment }: { environment: string }) {
  const color = KNOWN_COLORS[environment.toLowerCase()] ?? FALLBACK_COLOR;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
      {environment}
    </span>
  );
}
