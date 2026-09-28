import { slugify } from '../store/paths.js';
import type { SpecPlatform } from '../types.js';

/** The in-app URL for a spec screen — pasteable into a wiki page, comment, or notes field to link to it. */
export function specLink(project: string, platform: SpecPlatform, specPath: string): string {
  const encoded = specPath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `/specs/${platform}/${slugify(project)}/${encoded}`;
}

/** A markdown-formatted link to a spec screen — only markdown-syntax links become clickable in-app navigation when pasted into a wiki page or comment. */
export function specMarkdownLink(project: string, platform: SpecPlatform, specPath: string, title: string): string {
  const escapedTitle = title.replace(/([[\]])/g, '\\$1');
  return `[${escapedTitle}](${specLink(project, platform, specPath)})`;
}
