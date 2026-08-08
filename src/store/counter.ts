import fs from 'node:fs';
import path from 'node:path';
import { dataDir } from './paths.js';

function counterFile(): string {
  return path.join(dataDir(), '.counter');
}

/** Global, monotonically increasing id shared across every project and item type. */
export function nextId(): string {
  const file = counterFile();
  const current = fs.existsSync(file) ? parseInt(fs.readFileSync(file, 'utf8').trim(), 10) || 0 : 0;
  const next = current + 1;
  fs.writeFileSync(file, String(next), 'utf8');
  return String(next);
}
