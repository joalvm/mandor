// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export type { Decision } from './value/merge-conflict.js';
export { resolveFile } from './choice/resolve-file.js';
export { mergeFile } from './file/merge-file.js';
