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
import type { SpecScreen } from '../api';
import { useTheme } from '../context/ThemeContext';
import { layoutSpecs, type ScreenNodeData, type ExternalNodeData, type CrossJourneyNodeData, type OtherScreenLookup } from './specLayout';
import { SpecScreenNode } from './SpecScreenNode';
import { SpecExternalNode } from './SpecExternalNode';
import { SpecCrossJourneyNode } from './SpecCrossJourneyNode';

const nodeTypes = { screenCard: SpecScreenNode, externalNode: SpecExternalNode, crossJourneyNode: SpecCrossJourneyNode };

export function SpecRelationsView({
  screens,
  otherScreens,
  onSelectScreen,
  selectedPath,
}: {
  screens: SpecScreen[];
  /** Screens outside the journey being viewed, keyed by path — resolves cross-journey transition targets. */
  otherScreens?: Map<string, OtherScreenLookup>;
  /** Called with a screen's path when its node (in-journey or cross-journey) is clicked, to navigate there. */
  onSelectScreen: (path: string) => void;
  selectedPath?: string | null;
}) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => layoutSpecs(screens, otherScreens), [screens, otherScreens]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeId = hoveredId ?? (selectedPath ? `screen:${selectedPath}` : null);

  const connected = useMemo(() => {
    if (!activeId) return null;
    const ids = new Set<string>([activeId]);
    for (const e of baseEdges) {
      if (e.source === activeId) ids.add(e.target);
      if (e.target === activeId) ids.add(e.source);
    }
    return ids;
  }, [activeId, baseEdges]);

  const nodes: Node<ScreenNodeData | ExternalNodeData | CrossJourneyNodeData>[] = useMemo(
    () =>
      baseNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          highlighted: !!activeId && !!connected?.has(n.id),
          dimmed: !!activeId && !connected?.has(n.id),
        },
      })) as Node<ScreenNodeData | ExternalNodeData | CrossJourneyNodeData>[],
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

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.type === 'screenCard') {
        onSelectScreen(node.id.replace(/^screen:/, ''));
      } else if (node.type === 'crossJourneyNode') {
        onSelectScreen((node.data as CrossJourneyNodeData).path);
      }
    },
    [onSelectScreen]
  );
  const handleNodeEnter = useCallback((_: unknown, node: Node) => setHoveredId(node.id), []);
  const handleNodeLeave = useCallback(() => setHoveredId(null), []);

  if (screens.length === 0) {
    return (
      <div className="card flex h-full min-h-[28rem] items-center justify-center p-4">
        <p className="max-w-xs text-center text-sm text-neutral-400">No screens in this journey yet.</p>
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
