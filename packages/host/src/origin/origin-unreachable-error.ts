/** The address did not answer, or answered in a way git could not work with. */
export class OriginUnreachableError extends Error {
    constructor(detail: string) {
        super(detail);
        this.name = 'OriginUnreachableError';
    }
}
