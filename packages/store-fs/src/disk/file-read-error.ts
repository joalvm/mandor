import type { LoadWarning } from './load-warning.js';

/**
 * A file an operation needed could not be read. Loading turns this into a warning and keeps
 * going; writing cannot, because the missing content is part of what would be written back.
 */
export class FileReadError extends Error {
    constructor(readonly warning: LoadWarning) {
        super(`Cannot read ${warning.path}: ${warning.message}`);
        this.name = 'FileReadError';
    }
}
