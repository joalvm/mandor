/**
 * The one shape the collection refuses to hold: the top level is collections, so an item has no
 * file there and a collection has no place inside a folder. Whoever asked for it asked for a
 * workspace the lateral cannot draw.
 */
export class RootItemError extends Error {
    constructor(readonly path: string) {
        super(`The top level holds collections only: ${path}`);
        this.name = 'RootItemError';
    }
}
