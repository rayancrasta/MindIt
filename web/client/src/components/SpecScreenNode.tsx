import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ScreenNodeData } from './specLayout';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
  in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};

export function SpecScreenNode({ data }: NodeProps & { data: ScreenNodeData }) {
  const { screen, highlighted, dimmed } = data;
  const segments = screen.path.split('/');
  const folder = segments.length > 1 ? segments.slice(0, -1).join('/') : null;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-opacity duration-150 dark:bg-neutral-800 ${
        highlighted ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-neutral-200 dark:border-neutral-700'
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-none !bg-neutral-400" />
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40">
        {folder && <div className="truncate text-[10px] font-medium tracking-wide text-neutral-400 uppercase">{folder}</div>}
        <div className="flex items-center justify-between gap-1.5">
          <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{screen.title}</div>
          <span className={`shrink-0 rounded px-1 text-[9px] font-semibold whitespace-nowrap uppercase ${STATUS_STYLE[screen.status]}`}>
            {screen.status.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div>
        {screen.entryPoints.length === 0 && screen.exitPoints.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-400">No entry/exit points</div>
        ) : (
          <>
            {screen.entryPoints.map((t, i) => (
              <div key={`in-${i}`} className="flex items-center gap-1.5 border-b border-neutral-100 px-3 py-1 text-xs last:border-b-0 dark:border-neutral-800">
                <span className="shrink-0 rounded bg-blue-100 px-1 text-[9px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">IN</span>
                <span className="truncate text-neutral-600 dark:text-neutral-300">{t.label}</span>
              </div>
            ))}
            {screen.exitPoints.map((t, i) => (
              <div key={`out-${i}`} className="flex items-center gap-1.5 border-b border-neutral-100 px-3 py-1 text-xs last:border-b-0 dark:border-neutral-800">
                <span className="shrink-0 rounded bg-purple-100 px-1 text-[9px] font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">OUT</span>
                <span className="truncate text-neutral-600 dark:text-neutral-300">{t.label}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-none !bg-neutral-400" />
    </div>
  );
}
