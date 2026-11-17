/**
 * The name a move asked for is already somebody's. The operation does not happen and nothing on
 * disk changes: the name is the identity of an item, so inventing `pedido-creado-2` would be
 * choosing an identity on behalf of whoever asked for the other one.
 */
export class NameTakenError extends Error {
    constructor(readonly path: string) {
        super(`Already taken: ${path}`);
        this.name = 'NameTakenError';
    }
}
