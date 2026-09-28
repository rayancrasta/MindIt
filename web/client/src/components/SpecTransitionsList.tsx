import type { SpecTransition } from '../api';

function TransitionRow({ t }: { t: SpecTransition }) {
  return (
    <li className="flex items-center gap-2 border-b border-neutral-100 py-1 text-sm last:border-b-0 dark:border-neutral-800">
      <span className="min-w-0 flex-1 truncate">{t.label}</span>
      <span className="shrink-0 truncate text-xs text-neutral-400">{t.target ?? t.external}</span>
    </li>
  );
}

export function SpecTransitionsList({ entryPoints, exitPoints }: { entryPoints: SpecTransition[]; exitPoints: SpecTransition[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Entry points</h3>
        {entryPoints.length === 0 ? (
          <p className="text-sm text-neutral-400">None.</p>
        ) : (
          <ul>
            {entryPoints.map((t, i) => (
              <TransitionRow key={i} t={t} />
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Exit points</h3>
        {exitPoints.length === 0 ? (
          <p className="text-sm text-neutral-400">None.</p>
        ) : (
          <ul>
            {exitPoints.map((t, i) => (
              <TransitionRow key={i} t={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
