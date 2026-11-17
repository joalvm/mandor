/** Thrown when a file declares a format version newer than what this build understands. */
export class FormatVersionError extends Error {
    constructor(
        readonly found: number,
        readonly supported: number,
    ) {
        super(`Repo format ${String(found)} is newer than supported ${String(supported)}`);
        this.name = 'FormatVersionError';
    }
}
