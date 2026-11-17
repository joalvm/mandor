/** Rejected id or segment. Carries the offending value so the UI can quote it. */
export class IdError extends Error {
    constructor(readonly value: string) {
        super(`Invalid id: ${JSON.stringify(value)}`);
        this.name = 'IdError';
    }
}
