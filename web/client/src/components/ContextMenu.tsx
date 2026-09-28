import { useEffect, useRef, type ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

/** A small right-click menu, positioned at a fixed point and closed on outside click, Escape, or scroll. */
export function ContextMenu({ menu, onClose }: { menu: ContextMenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const left = Math.min(menu.x, window.innerWidth - 200);
  const top = Math.min(menu.y, window.innerHeight - menu.items.length * 32 - 16);

  return (
    <div
      ref={ref}
      style={{ left, top }}
      className="fixed z-50 min-w-[170px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      {menu.items.map((item, i) => (
        <button
          key={i}
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onClick();
          }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-40 ${
            item.danger
              ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
              : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          {item.icon && <span className="size-3.5 shrink-0">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
