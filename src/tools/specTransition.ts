import { z } from 'zod';
import { SPEC_TEST_TYPES } from '../types.js';

/** Shared transition shape for entry/exit points, used by create_spec_screen / update_spec_screen / set_spec_transition. */
export const transitionSchema = z
  .object({
    label: z.string().min(1).describe('The trigger/action for this transition, e.g. "tap Checkout" or "swipe back"'),
    target: z
      .string()
      .optional()
      .describe('Path of another screen in the same project + platform that this transition leads to/from'),
    external: z
      .string()
      .optional()
      .describe(
        'Use instead of target when there is no screen on the other end, e.g. "App launch", "Push notification", "Deep link"'
      ),
  })
  .describe('Exactly one of target or external should be set');

export const testCaseSchema = z.object({
  type: z.enum(SPEC_TEST_TYPES as [string, ...string[]]).describe('"unit" or "integration"'),
  description: z.string().min(1).describe('What this test case must verify'),
});

interface TransitionLike {
  label: string;
  target?: string;
  external?: string;
}

function formatTransition(t: TransitionLike): string {
  const dest = t.target ?? `(${t.external})`;
  return `- ${t.label} -> ${dest}`;
}

export function formatTransitions(label: string, transitions: TransitionLike[]): string {
  if (transitions.length === 0) return `${label}: (none)`;
  return `${label}:\n${transitions.map(formatTransition).join('\n')}`;
}

export function formatTestCases(testCases: { type: string; description: string }[] | undefined): string {
  if (!testCases || testCases.length === 0) return 'Test cases: (none)';
  return `Test cases:\n${testCases.map((t) => `- [${t.type}] ${t.description}`).join('\n')}`;
}
