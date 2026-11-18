import type { WorkspaceKind } from '@mandor/schema';

/**
 * The bundle was written by the other app: its items are of a kind this app has no tab for, so
 * nothing of it is read.
 * It belongs to the contract and not to a format: the host tells it apart and gives it its own code.
 */
export class ImportOtherAppError extends Error {
    constructor(
        readonly found: WorkspaceKind,
        readonly expected: WorkspaceKind,
    ) {
        super(`The workspace file belongs to the ${found} app, not to ${expected}`);

        this.name = 'ImportOtherAppError';
    }
}
