import { slugify } from '../store/paths.js';

/** The in-app URL for a wiki page — pasteable into a comment or notes field to link to it. */
export function wikiLink(project: string, wikiPath: string): string {
  const encoded = wikiPath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `/wiki/${slugify(project)}/${encoded}`;
}
