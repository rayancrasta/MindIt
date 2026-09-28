/** A journey is a top-level folder in the spec tree; screens with no folder (a bare root-level path, no "/") are bucketed into this implicit journey. */
export const GENERAL_JOURNEY = '__general__';

export function journeyKeyForPath(path: string): string {
  const idx = path.indexOf('/');
  return idx === -1 ? GENERAL_JOURNEY : path.slice(0, idx);
}

export function journeyLabel(key: string): string {
  return key === GENERAL_JOURNEY ? 'General' : key;
}
