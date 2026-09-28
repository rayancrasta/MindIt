import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function FolderBrowserModal({
  initialPath,
  onClose,
  onSelect,
}: {
  initialPath?: string;
  onClose: () => void;
  onSelect: (path: string) => void;
}) {
  const [currentPath, setCurrentPath] = useState<string | undefined>(initialPath);
  const { data, isLoading, error } = useQuery({
    queryKey: ['fs-browse', currentPath],
    queryFn: () => api.fs.browse(currentPath),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[70vh] w-full max-w-md flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Choose a folder</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-2 truncate rounded-md bg-neutral-100 px-2 py-1.5 font-mono text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          {data?.path ?? currentPath ?? '…'}
        </div>

        <div className="custom-scrollbar min-h-40 flex-1 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-700">
          {isLoading && <div className="p-3 text-sm text-neutral-400">Loading…</div>}
          {error && (
            <div className="p-3 text-sm text-red-500">{error instanceof Error ? error.message : String(error)}</div>
          )}
          {data && (
            <div className="p-1">
              {data.parent && (
                <button
                  onClick={() => setCurrentPath(data.parent!)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  .. (up)
                </button>
              )}
              {data.directories.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-neutral-400">No subfolders</div>
              )}
              {data.directories.map((name) => (
                <button
                  key={name}
                  onClick={() => setCurrentPath(`${data.path}/${name}`)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <span aria-hidden>📁</span> {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            disabled={!data}
            onClick={() => data && onSelect(data.path)}
            className="btn-primary px-3 py-1.5 text-sm"
          >
            Use this folder
          </button>
        </div>
      </div>
    </div>
  );
}
