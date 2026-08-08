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

export function safeHandler<A>(fn: (args: A) => string | Promise<string>) {
  return async (args: A) => {
    try {
      const text = await fn(args);
      return textResult(text);
    } catch (err) {
      return textResult(`Error: ${(err as Error).message}`);
    }
  };
}
