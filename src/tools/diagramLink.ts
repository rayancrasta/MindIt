import { slugify } from '../store/paths.js';
import type { DiagramKind } from '../types.js';

/** The in-app URL for a diagram — pasteable into a wiki page, comment, or notes field to link to it. */
export function diagramLink(project: string, diagramPath: string, kind: DiagramKind): string {
  const encoded = diagramPath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `/diagrams/${kind}/${slugify(project)}/${encoded}`;
}

/**
 * A markdown-formatted link to a diagram, e.g. for pasting into a wiki page or comment. Wiki pages
 * and comments render markdown, and only markdown-syntax links become clickable in-app navigation —
 * a bare diagramLink() path pasted as plain text won't.
 */
export function diagramMarkdownLink(project: string, diagramPath: string, kind: DiagramKind, title: string): string {
  const escapedTitle = title.replace(/([[\]])/g, '\\$1');
  return `[${escapedTitle}](${diagramLink(project, diagramPath, kind)})`;
}
