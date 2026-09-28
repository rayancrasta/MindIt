import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { SchemaTable } from '../api';

export const NODE_WIDTH = 260;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 26;
const FOOTER_PADDING = 8;

export function nodeHeight(table: SchemaTable): number {
  return HEADER_HEIGHT + Math.max(table.columns.length, 1) * ROW_HEIGHT + FOOTER_PADDING;
}

export interface TableNodeData extends Record<string, unknown> {
  table: SchemaTable;
  highlighted: boolean;
  dimmed: boolean;
}

export interface SchemaFlowLayout {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
}

/** Lays out every table as a dagre graph node, with one edge per foreign key, connected column-to-column. */
export function layoutSchema(tables: SchemaTable[]): SchemaFlowLayout {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  const pathsPresent = new Set(tables.map((t) => t.path));

  for (const table of tables) {
    g.setNode(table.path, { width: NODE_WIDTH, height: nodeHeight(table) });
  }

  const edges: Edge[] = [];
  for (const table of tables) {
    for (const col of table.columns) {
      if (!col.foreignKey || !pathsPresent.has(col.foreignKey.table)) continue;
      g.setEdge(table.path, col.foreignKey.table);
      edges.push({
        id: `${table.path}:${col.name}->${col.foreignKey.table}:${col.foreignKey.column}`,
        source: table.path,
        target: col.foreignKey.table,
        sourceHandle: `col-${col.name}`,
        targetHandle: `col-${col.foreignKey.column}`,
        label: `${col.name} → ${col.foreignKey.column}`,
        type: 'smoothstep',
      });
    }
  }

  dagre.layout(g);

  const nodes: Node<TableNodeData>[] = tables.map((table) => {
    const pos = g.node(table.path);
    const h = nodeHeight(table);
    return {
      id: table.path,
      type: 'tableCard',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - h / 2 },
      data: { table, highlighted: false, dimmed: false },
      style: { width: NODE_WIDTH },
      width: NODE_WIDTH,
      height: h,
    };
  });

  return { nodes, edges };
}
