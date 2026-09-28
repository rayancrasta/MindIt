import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CrossJourneyNodeData } from './specLayout';
import { journeyLabel } from './specJourneys';

/** A pointer to a screen that belongs to a different journey — rendered instead of silently dropping the edge. */
export function SpecCrossJourneyNode({ data }: NodeProps & { data: CrossJourneyNodeData }) {
  const { title, journey, highlighted, dimmed } = data;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border border-dashed bg-neutral-50 px-2.5 py-1.5 text-xs transition-opacity duration-150 dark:bg-neutral-900/40 ${
        highlighted ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-neutral-300 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400'
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-none !bg-neutral-400" />
      <span aria-hidden>↗</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-neutral-700 dark:text-neutral-200">{title}</span>
        <span className="ml-1 text-neutral-400">— {journeyLabel(journey)}</span>
      </span>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-none !bg-neutral-400" />
    </div>
  );
}
