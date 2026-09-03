import { useState } from 'react';
import type { ItemType } from '../api';

const COLORS: Record<ItemType, string> = {
  feature: 'bg-purple-500/10 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300',
  story: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
  task: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  bug: 'bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300',
};

const ICON: Record<ItemType, string> = {
  feature: '★',
  story: '◆',
  task: '☑',
  bug: '✗',
};

export function ItemTypeBadge({
  type,
  id,
  checked,
  onToggle,
}: {
  type: ItemType;
  id?: string;
  /** When provided (together with onToggle), the badge's icon becomes a clickable checkbox. */
  checked?: boolean;
  onToggle?: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const className = `inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${COLORS[type]}`;
  const content = (
    <>
      <span aria-hidden>{onToggle ? (checked ? '☑' : '☐') : ICON[type]}</span>
      <span className="capitalize">{type}</span>
      {id && <span className="opacity-60">#{id}</span>}
    </>
  );

  if (!onToggle) {
    return <span className={className}>{content}</span>;
  }

  async function handleClick() {
    setPending(true);
    try {
      await onToggle!();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      title={checked ? 'Resolved — click to reopen' : 'Click to mark resolved'}
      className={`${className} cursor-pointer transition-transform hover:scale-105 disabled:opacity-50`}
    >
      {content}
    </button>
  );
}
