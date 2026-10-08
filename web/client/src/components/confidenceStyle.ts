import type { Confidence } from '../api';

interface ConfidenceStyle {
  icon: string;
  badge: string;
  chipActive: string;
  dot: string;
  accent: string;
}

export const CONFIDENCE_STYLE: Record<Confidence, ConfidenceStyle> = {
  low: {
    icon: '⚠️',
    badge: 'bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    chipActive: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    accent: 'border-l-rose-500 dark:border-l-rose-400/70',
  },
  medium: {
    icon: '🤔',
    badge: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
    chipActive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    accent: 'border-l-amber-500 dark:border-l-amber-400/70',
  },
  high: {
    icon: '👍',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
    chipActive: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    accent: 'border-l-emerald-500 dark:border-l-emerald-400/70',
  },
};
