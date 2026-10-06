import { useState, type ReactNode } from 'react';

const MONTH = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

export function formatDay(ts: string): string {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function formatTime(ts: string): string {
  return TIME.format(new Date(ts));
}

export function timeAgo(ts: string): string {
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDay(ts);
}

interface Group<T> {
  key: string;
  label: string;
  days: { key: string; label: string; items: T[] }[];
  count: number;
}

/** Groups newest-first items into month → day buckets, keeping their order. */
function group<T>(items: T[], getTime: (t: T) => string): Group<T>[] {
  const months: Group<T>[] = [];
  for (const item of items) {
    const ts = getTime(item);
    const monthKey = ts.slice(0, 7);
    const dayKey = ts.slice(0, 10);
    let month = months[months.length - 1];
    if (!month || month.key !== monthKey) {
      month = { key: monthKey, label: MONTH.format(new Date(ts)), days: [], count: 0 };
      months.push(month);
    }
    let day = month.days[month.days.length - 1];
    if (!day || day.key !== dayKey) {
      day = { key: dayKey, label: formatDay(ts), items: [] };
      month.days.push(day);
    }
    day.items.push(item);
    month.count++;
  }
  return months;
}

interface Props<T> {
  items: T[];
  getTime: (t: T) => string;
  getKey: (t: T) => string;
  /** Tailwind background class for the item's dot on the rail. */
  dotClass?: (t: T) => string;
  render: (t: T) => ReactNode;
}

/** A month → day timeline with a rail down the left; months collapse. Items must already be newest first. */
export function Timeline<T>({ items, getTime, getKey, dotClass, render }: Props<T>) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <div className="space-y-6">
      {group(items, getTime).map((month) => {
        const isCollapsed = collapsed.has(month.key);
        return (
          <section key={month.key}>
            <button
              onClick={() => toggle(month.key)}
              className="mb-3 flex w-full items-center gap-2 text-left"
              aria-expanded={!isCollapsed}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              <h2 className="text-base font-semibold tracking-tight">{month.label}</h2>
              <span className="rounded-full bg-neutral-200/70 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                {month.count}
              </span>
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700/70" />
            </button>

            {!isCollapsed && (
              <div className="space-y-5 pl-1">
                {month.days.map((day) => (
                  <div key={day.key}>
                    <p className="mb-2 pl-6 text-xs font-medium uppercase tracking-wide text-neutral-400">{day.label}</p>
                    <div className="relative ml-[7px] space-y-3 border-l border-neutral-200 pl-5 dark:border-neutral-700">
                      {day.items.map((item) => (
                        <div key={getKey(item)} className="relative">
                          <span
                            className={`absolute -left-[26px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-neutral-50 dark:ring-neutral-900 ${
                              dotClass?.(item) ?? 'bg-violet-500'
                            }`}
                          />
                          {render(item)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
