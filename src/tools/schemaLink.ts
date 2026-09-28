import { slugify } from '../store/paths.js';

/** The in-app URL for a schema table — pasteable into a wiki page, comment, or notes field to link to it. */
export function schemaLink(project: string, schemaPath: string): string {
  const encoded = schemaPath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `/schemas/${slugify(project)}/${encoded}`;
}
