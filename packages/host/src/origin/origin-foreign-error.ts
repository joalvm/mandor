/** The address answered, but what it holds is not an Mandor repo, so nothing of it is brought. */
export class OriginForeignError extends Error {
    constructor(url: string) {
        super(`the origin ${url} has content that is not an Mandor repo`);
        this.name = 'OriginForeignError';
    }
}
