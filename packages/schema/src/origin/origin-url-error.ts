/** A url that cannot name an origin. Carries the offending value so the log can quote it. */
export class OriginUrlError extends Error {
    constructor(readonly value: string) {
        super(`Invalid origin url: ${JSON.stringify(value)}`);
        this.name = 'OriginUrlError';
    }
}
