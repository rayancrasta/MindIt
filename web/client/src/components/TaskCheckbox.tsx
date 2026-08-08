import { useState } from 'react';

export function TaskCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => Promise<void> }) {
  const [pending, setPending] = useState(false);

  async function handleChange() {
    setPending(true);
    try {
      await onToggle();
    } finally {
      setPending(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={pending}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      title={checked ? 'Closed — click to reopen' : 'Click to mark closed'}
      className="h-4 w-4 shrink-0 cursor-pointer accent-blue-500 disabled:opacity-50"
    />
  );
}
