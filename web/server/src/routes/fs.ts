import { Router } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const fsRouter = Router();

/** Lists subdirectories of a given (or the home) directory, for the "choose a folder" picker. Read-only, directories only. */
fsRouter.get('/browse', (req, res) => {
  const requested = typeof req.query.path === 'string' && req.query.path.trim() ? req.query.path.trim() : os.homedir();
  const target = path.resolve(requested);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(target, { withFileTypes: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }

  const directories = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
  const parent = path.dirname(target);

  res.json({ path: target, parent: parent === target ? null : parent, directories });
});
