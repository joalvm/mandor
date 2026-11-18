import type { ResourceUriReason } from './resource-uri-reason.js';

/** A URI that names nothing Mandor can open. Carries the part that broke and its text. */
export class ResourceUriError extends Error {
    constructor(
        readonly reason: ResourceUriReason,
        readonly value: string,
    ) {
        super(`Invalid resource URI (${reason}): ${JSON.stringify(value)}`);
        this.name = 'ResourceUriError';
    }
}
