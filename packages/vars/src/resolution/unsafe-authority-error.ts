/**
 * A variable sits where the authority of a URL goes and its value could move that authority:
 * a `/`, `@`, `?` or `#` turns `https://{{host}}/x` into a request to a host nobody typed.
 * Carries the name, so the interface can say which one.
 */
export class UnsafeAuthorityError extends Error {
    constructor(readonly variable: string) {
        super(`unsafe authority variable: ${variable}`);
        this.name = 'UnsafeAuthorityError';
    }
}
