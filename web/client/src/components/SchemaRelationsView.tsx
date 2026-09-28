import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { SchemaTable } from '../api';
import { useTheme } from '../context/ThemeContext';
import { layoutSchema, type TableNodeData } from './schemaLayout';
import { SchemaTableNode } from './SchemaTableNode';

const nodeTypes = { tableCard: SchemaTableNode };

export function SchemaRelationsView({
  tables,
  onSelectTable,
  selectedPath,
}: {
  tables: SchemaTable[];
  onSelectTable: (path: string) => void;
  selectedPath?: string | null;
}) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => layoutSchema(tables), [tables]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeId = hoveredId ?? selectedPath ?? null;

  const connected = useMemo(() => {
    if (!activeId) return null;
    const ids = new Set<string>([activeId]);
    for (const e of baseEdges) {
      if (e.source === activeId) ids.add(e.target);
      if (e.target === activeId) ids.add(e.source);
    }
    return ids;
  }, [activeId, baseEdges]);

  const nodes: Node<TableNodeData>[] = useMemo(
    () =>
      baseNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          highlighted: !!activeId && !!connected?.has(n.id),
          dimmed: !!activeId && !connected?.has(n.id),
        },
      })),
    [baseNodes, connected, activeId]
  );

  const edges: Edge[] = useMemo(
    () =>
      baseEdges.map((e) => {
        const isActive = !!activeId && (e.source === activeId || e.target === activeId);
        return {
          ...e,
          style: {
            stroke: isActive ? 'var(--color-blue-500)' : dark ? 'var(--color-neutral-600)' : 'var(--color-neutral-300)',
            strokeWidth: isActive ? 2.5 : 1.5,
            opacity: activeId && !isActive ? 0.35 : 1,
          },
          labelStyle: { fontSize: 10, fill: 'var(--color-neutral-500)' },
          labelBgStyle: { fill: dark ? 'var(--color-neutral-800)' : 'var(--color-white)', fillOpacity: 0.9 },
        };
      }),
    [baseEdges, activeId, dark]
  );

  const handleNodeClick = useCallback((_: unknown, node: Node) => onSelectTable(node.id), [onSelectTable]);
  const handleNodeEnter = useCallback((_: unknown, node: Node) => setHoveredId(node.id), []);
  const handleNodeLeave = useCallback(() => setHoveredId(null), []);

  if (tables.length === 0) {
    return (
      <div className="card flex h-full min-h-[28rem] items-center justify-center p-4">
        <p className="max-w-xs text-center text-sm text-neutral-400">
          No tables yet. Switch to the Tree tab to create one — they'll show up here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="schema-flow h-full min-h-[28rem] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={handleNodeEnter}
          onNodeMouseLeave={handleNodeLeave}
          fitView
          fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1.25 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color={dark ? 'var(--color-neutral-700)' : 'var(--color-neutral-300)'}
          />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            style={{ width: 140, height: 96 }}
            nodeColor={dark ? 'var(--color-neutral-600)' : 'var(--color-neutral-300)'}
            maskColor={dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
