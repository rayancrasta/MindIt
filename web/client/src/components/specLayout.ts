import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { SpecScreen } from '../api';

export const NODE_WIDTH = 240;
const HEADER_HEIGHT = 48;
const ROW_HEIGHT = 22;
const FOOTER_PADDING = 10;
export const EXTERNAL_WIDTH = 160;
const EXTERNAL_HEIGHT = 40;

export function screenNodeHeight(screen: SpecScreen): number {
  const rows = Math.max(screen.entryPoints.length + screen.exitPoints.length, 1);
  return HEADER_HEIGHT + rows * ROW_HEIGHT + FOOTER_PADDING;
}

export interface ScreenNodeData extends Record<string, unknown> {
  screen: SpecScreen;
  highlighted: boolean;
  dimmed: boolean;
}

export interface ExternalNodeData extends Record<string, unknown> {
  label: string;
  highlighted: boolean;
  dimmed: boolean;
}

export interface CrossJourneyNodeData extends Record<string, unknown> {
  path: string;
  title: string;
  /** The other journey's key (not display label) — resolve with journeyLabel() before rendering. */
  journey: string;
  highlighted: boolean;
  dimmed: boolean;
}

export interface SpecFlowLayout {
  nodes: Node[];
  edges: Edge[];
}

function screenNodeId(path: string): string {
  return `screen:${path}`;
}

function externalNodeId(label: string): string {
  return `external:${label}`;
}

function crossJourneyNodeId(path: string): string {
  return `crossJourney:${path}`;
}

/** A screen not in the journey being viewed, looked up by path — used to render a pointer node for a transition that leads outside the current journey. */
export interface OtherScreenLookup {
  title: string;
  /** The other journey's key (not display label). */
  journey: string;
}

/**
 * Lays out every screen as a dagre graph node, with one edge per entry/exit transition, deduped across both
 * directions. Uses a top-to-bottom "staged funnel" layout: screens are ranked by hop-distance from their entry
 * points, growing downward (natural scroll direction) one row per stage, with same-stage screens spread
 * horizontally — so total width tracks the widest single stage rather than the number of stages.
 *
 * `otherScreens` resolves a transition target that isn't part of `screens` (i.e. it belongs to a different
 * journey) so it renders as a labeled pointer node instead of silently dropping the edge.
 */
export function layoutSpecs(screens: SpecScreen[], otherScreens?: Map<string, OtherScreenLookup>): SpecFlowLayout {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  const pathsPresent = new Set(screens.map((s) => s.path));
  const externalLabels = new Set<string>();
  const crossJourneyPaths = new Set<string>();

  for (const screen of screens) {
    g.setNode(screenNodeId(screen.path), { width: NODE_WIDTH, height: screenNodeHeight(screen) });
  }

  type EdgeSpec = { id: string; source: string; target: string; label: string };
  const edgeKeys = new Set<string>();
  const edgeSpecs: EdgeSpec[] = [];
  function addEdge(source: string, target: string, label: string) {
    const key = `${source}->${target}:${label}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edgeSpecs.push({ id: key, source, target, label });
  }

  function resolveTarget(target: string): string | null {
    if (pathsPresent.has(target)) return screenNodeId(target);
    if (otherScreens?.has(target)) {
      crossJourneyPaths.add(target);
      return crossJourneyNodeId(target);
    }
    return null;
  }

  for (const screen of screens) {
    for (const exit of screen.exitPoints) {
      if (exit.target) {
        const targetId = resolveTarget(exit.target);
        if (targetId) addEdge(screenNodeId(screen.path), targetId, exit.label);
      } else if (exit.external) {
        externalLabels.add(exit.external);
        addEdge(screenNodeId(screen.path), externalNodeId(exit.external), exit.label);
      }
    }
    for (const entry of screen.entryPoints) {
      if (entry.target) {
        const sourceId = resolveTarget(entry.target);
        if (sourceId) addEdge(sourceId, screenNodeId(screen.path), entry.label);
      } else if (entry.external) {
        externalLabels.add(entry.external);
        addEdge(externalNodeId(entry.external), screenNodeId(screen.path), entry.label);
      }
    }
  }

  for (const label of externalLabels) {
    g.setNode(externalNodeId(label), { width: EXTERNAL_WIDTH, height: EXTERNAL_HEIGHT });
  }
  for (const path of crossJourneyPaths) {
    g.setNode(crossJourneyNodeId(path), { width: NODE_WIDTH, height: EXTERNAL_HEIGHT });
  }
  for (const e of edgeSpecs) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const nodes: Node[] = [
    ...screens.map((screen) => {
      const pos = g.node(screenNodeId(screen.path));
      const h = screenNodeHeight(screen);
      return {
        id: screenNodeId(screen.path),
        type: 'screenCard',
        position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - h / 2 },
        data: { screen, highlighted: false, dimmed: false } satisfies ScreenNodeData,
        style: { width: NODE_WIDTH },
        width: NODE_WIDTH,
        height: h,
      };
    }),
    ...Array.from(externalLabels).map((label) => {
      const pos = g.node(externalNodeId(label));
      return {
        id: externalNodeId(label),
        type: 'externalNode',
        position: { x: pos.x - EXTERNAL_WIDTH / 2, y: pos.y - EXTERNAL_HEIGHT / 2 },
        data: { label, highlighted: false, dimmed: false } satisfies ExternalNodeData,
        style: { width: EXTERNAL_WIDTH },
        width: EXTERNAL_WIDTH,
        height: EXTERNAL_HEIGHT,
      };
    }),
    ...Array.from(crossJourneyPaths).map((path) => {
      const pos = g.node(crossJourneyNodeId(path));
      const other = otherScreens!.get(path)!;
      return {
        id: crossJourneyNodeId(path),
        type: 'crossJourneyNode',
        position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - EXTERNAL_HEIGHT / 2 },
        data: { path, title: other.title, journey: other.journey, highlighted: false, dimmed: false } satisfies CrossJourneyNodeData,
        style: { width: NODE_WIDTH },
        width: NODE_WIDTH,
        height: EXTERNAL_HEIGHT,
      };
    }),
  ];

  const edges: Edge[] = edgeSpecs.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
  }));

  return { nodes, edges };
}
