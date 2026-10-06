import type { ThoughtKind } from '../api';

interface KindStyle {
  icon: string;
  /** Pill used on cards. */
  badge: string;
  /** Selected state for a filter/selector chip. */
  chipActive: string;
  /** Dot on the timeline rail. */
  dot: string;
  /** Left accent on the card. */
  accent: string;
}

export const KIND_STYLE: Record<ThoughtKind, KindStyle> = {
  thought: {
    icon: '💭',
    badge: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
    chipActive: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    accent: 'border-l-sky-500 dark:border-l-sky-400/70',
  },
  doubt: {
    icon: '🤔',
    badge: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
    chipActive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    accent: 'border-l-amber-500 dark:border-l-amber-400/70',
  },
  decision: {
    icon: '✅',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
    chipActive: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    accent: 'border-l-emerald-500 dark:border-l-emerald-400/70',
  },
  idea: {
    icon: '💡',
    badge: 'bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
    chipActive: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
    accent: 'border-l-violet-500 dark:border-l-violet-400/70',
  },
  question: {
    icon: '❓',
    badge: 'bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    chipActive: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    accent: 'border-l-rose-500 dark:border-l-rose-400/70',
  },
};
