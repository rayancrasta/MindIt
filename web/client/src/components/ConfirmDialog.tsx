export interface ConfirmDialogState {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/** A small in-app confirmation overlay, used instead of window.confirm (which some embedded browser contexts silently auto-dismiss). */
export function ConfirmDialog({ state, onClose }: { state: ConfirmDialogState | null; onClose: () => void }) {
  if (!state) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10"
      >
        <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-200">{state.message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              state.onConfirm();
            }}
            className="btn-danger"
          >
            {state.confirmLabel ?? 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
