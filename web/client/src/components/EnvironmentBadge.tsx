const KNOWN_COLORS: Record<string, string> = {
  production: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300 dark:ring-indigo-400/30',
  staging: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300 dark:ring-amber-400/30',
  development: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300 dark:ring-sky-400/30',
  preview: 'bg-purple-500/10 text-purple-700 ring-purple-500/20 dark:text-purple-300 dark:ring-purple-400/30',
};

const FALLBACK_COLOR =
  'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300 dark:ring-slate-400/20';

export function EnvironmentBadge({ environment }: { environment: string }) {
  const color = KNOWN_COLORS[environment.toLowerCase()] ?? FALLBACK_COLOR;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}
    >
      {environment}
    </span>
  );
}
