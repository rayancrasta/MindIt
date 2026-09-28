import type { SpecTransition } from '../api';

interface TransitionRowProps {
  t: SpecTransition;
  onNavigate?: (path: string) => void;
  onUnlink?: (t: SpecTransition) => void;
}

function TransitionRow({ t, onNavigate, onUnlink }: TransitionRowProps) {
  return (
    <li className="flex items-center gap-2 border-b border-neutral-100 py-1 text-sm last:border-b-0 dark:border-neutral-800">
      <span className="min-w-0 flex-1 truncate">{t.label}</span>
      {t.target ? (
        <button
          type="button"
          onClick={() => onNavigate?.(t.target as string)}
          className="shrink-0 truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
          title={`Open ${t.target}`}
        >
          {t.target}
        </button>
      ) : (
        <span className="shrink-0 truncate text-xs text-neutral-400">{t.external}</span>
      )}
      {t.target && onUnlink && (
        <button
          type="button"
          onClick={() => onUnlink(t)}
          className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
          title="Unlink"
        >
          ✕
        </button>
      )}
    </li>
  );
}

export function SpecTransitionsList({
  entryPoints,
  exitPoints,
  onNavigate,
  onUnlink,
}: {
  entryPoints: SpecTransition[];
  exitPoints: SpecTransition[];
  onNavigate?: (path: string) => void;
  onUnlink?: (direction: 'entry' | 'exit', t: SpecTransition) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Entry points</h3>
        {entryPoints.length === 0 ? (
          <p className="text-sm text-neutral-400">None.</p>
        ) : (
          <ul>
            {entryPoints.map((t, i) => (
              <TransitionRow key={i} t={t} onNavigate={onNavigate} onUnlink={onUnlink && ((t) => onUnlink('entry', t))} />
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
              <TransitionRow key={i} t={t} onNavigate={onNavigate} onUnlink={onUnlink && ((t) => onUnlink('exit', t))} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
