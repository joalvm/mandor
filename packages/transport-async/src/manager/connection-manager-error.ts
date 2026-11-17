/**
 * A send named a connection the manager does not hold. Opening never raises it: an id already
 * held is replaced, not refused.
 */
export class ConnectionManagerError extends Error {
    constructor(
        readonly operation: 'send',
        readonly connectionId: string,
    ) {
        super(`cannot ${operation} connection: ${connectionId}`);
        this.name = 'ConnectionManagerError';
    }
}
