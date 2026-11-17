/** A clash was asked to close while some of its questions still have no answer. */
export class ConflictOpenError extends Error {
    constructor(id: string, open: number) {
        super(`the clash ${id} still has ${String(open)} questions without an answer`);
        this.name = 'ConflictOpenError';
    }
}
