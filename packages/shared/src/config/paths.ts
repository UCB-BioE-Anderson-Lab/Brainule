import * as fs from 'fs';
import * as path from 'path';

/**
 * Walk up from this file until we find the workspace root (the directory
 * containing pnpm-workspace.yaml). Falls back to process.cwd() when the marker
 * is absent — e.g. inside a container image that only ships `dist/`.
 *
 * Resolving from __dirname rather than cwd means `pnpm dev` (cwd =
 * apps/node-server) and `node dist/server.js` (cwd = repo root) both find the
 * course package and prompt files.
 */
function findWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

export const workspaceRoot = findWorkspaceRoot(__dirname);

/**
 * Resolve a configured directory. Absolute paths are used as-is; relative
 * paths are resolved against the workspace root, never the current working
 * directory.
 */
export function resolveFromRoot(dir: string): string {
  return path.isAbsolute(dir) ? dir : path.resolve(workspaceRoot, dir);
}
