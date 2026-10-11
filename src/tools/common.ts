import { z } from 'zod';

export const statusSchema = z.enum(['new', 'in_progress', 'testing', 'resolved', 'closed']);

export function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function formatItemList(
  items: { id: string; title: string; status: string; project: string }[],
  showProject: boolean
): string {
  if (items.length === 0) return 'None found.';
  return items
    .map((i) => `${i.title} [${i.id}] (${i.status})${showProject ? ` — ${i.project}` : ''}`)
    .join('\n');
}

/** Default ceiling on any one tool result, so nothing blows past a client's tool-result limit by accident. */
export const RESULT_CAP = 15_000;

/** Collapses whitespace and clips to `max` characters with an ellipsis. */
export function clip(text: string, max: number): string {
  const flat = text.split(/\s+/).join(' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

/** The first paragraph of a markdown body (up to the first blank line). */
export function firstParagraph(text: string): string {
  return text.trim().split(/\n\s*\n/)[0] ?? '';
}

/** Cuts `text` at a line boundary so it fits in `max` characters, ending with a notice saying how to get more. */
export function capText(text: string, max: number, hint: string): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf('\n', max);
  const kept = text.slice(0, cut > max / 2 ? cut : max);
  return `${kept}\n\n[Truncated: showing ${kept.length.toLocaleString('en-US')} of ${text.length.toLocaleString('en-US')} characters. ${hint}]`;
}

const CAP_HINT = 'Narrow the request (filters, limit) or pass detail: true where the tool offers it.';

/**
 * Wraps a tool handler: errors become text, and results are capped at RESULT_CAP unless the caller passed
 * `detail: true`. Tools that read one object the caller named (get_item, read_diagram, ...) pass
 * `{ cap: false }`, since asking for that object is already the opt-in.
 */
export function safeHandler<A>(fn: (args: A) => string | Promise<string>, opts: { cap?: boolean } = {}) {
  return async (args: A) => {
    try {
      const text = await fn(args);
      const detail = (args as { detail?: unknown } | undefined)?.detail === true;
      return textResult(opts.cap === false || detail ? text : capText(text, RESULT_CAP, CAP_HINT));
    } catch (err) {
      return textResult(`Error: ${(err as Error).message}`);
    }
  };
}
