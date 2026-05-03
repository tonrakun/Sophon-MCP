import path from "node:path";
import fs from "node:fs";

let projectRoot: string | null = null;

export function setRoot(root: string): void {
  projectRoot = path.resolve(root);
}

export function getRoot(): string {
  if (!projectRoot) throw new Error("Project root not set. Pass --root <path>.");
  return projectRoot;
}

export function safePath(relativeOrAbsolute: string): string {
  const root = getRoot();
  const resolved = path.isAbsolute(relativeOrAbsolute)
    ? path.resolve(relativeOrAbsolute)
    : path.resolve(root, relativeOrAbsolute);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Path traversal denied: "${relativeOrAbsolute}" is outside project root.`);
  }

  // Resolve symlinks and re-check
  try {
    const real = fs.realpathSync(resolved);
    if (!real.startsWith(root + path.sep) && real !== root) {
      throw new Error(`Symlink traversal denied: resolves outside project root.`);
    }
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  return resolved;
}

export function toRelative(absolutePath: string): string {
  return path.relative(getRoot(), absolutePath);
}
