import type { CurlInvalidReason } from '@mandor/schema';

/** A curl that cannot be read at all: the reason, and what the text named when it failed. */
export class CurlParseError extends Error {
    constructor(
        readonly reason: CurlInvalidReason,
        readonly subject?: string,
    ) {
        super(`the curl cannot be read: ${reason}`);
        this.name = 'CurlParseError';
    }
}
