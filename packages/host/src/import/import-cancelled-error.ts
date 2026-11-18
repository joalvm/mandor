/** The person stopped the read of a document before it ended. */
export class ImportCancelledError extends Error {
    constructor() {
        super('the import was cancelled');
        this.name = 'ImportCancelledError';
    }
}
