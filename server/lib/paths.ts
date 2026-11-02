import path from "path";

/** Project root: Docker WORKDIR, or cwd when running `node dist/index.js`. */
export const APP_ROOT = process.env.APP_ROOT || process.cwd();

export const DATA_DIR = process.env.DATA_DIR || path.join(APP_ROOT, "data");

export const EVAL_DIR = process.env.EVAL_DIR || path.join(APP_ROOT, "eval");

export const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(APP_ROOT, "dist", "public");

export function dataFile(name: string): string {
  return path.join(DATA_DIR, name);
}
