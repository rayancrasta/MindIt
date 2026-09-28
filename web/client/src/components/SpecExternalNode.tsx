import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ExternalNodeData } from './specLayout';

export function SpecExternalNode({ data }: NodeProps & { data: ExternalNodeData }) {
  const { label, highlighted, dimmed } = data;
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-dashed px-3 py-2 text-center text-xs font-medium text-neutral-500 transition-opacity duration-150 dark:text-neutral-400 ${
        highlighted ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-neutral-300 dark:border-neutral-600'
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-none !bg-neutral-400" />
      <span className="truncate">{label}</span>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-none !bg-neutral-400" />
    </div>
  );
}
