import { slugify } from '../store/paths.js';

/** The in-app URL for a diagram — pasteable into a wiki page, comment, or notes field to link to it. */
export function diagramLink(project: string, diagramPath: string): string {
  const encoded = diagramPath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `/diagrams/${slugify(project)}/${encoded}`;
}
