/** A file a request names that main will not read: outside the repo, in a folder of the app, or not there. */
export class RepoFileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RepoFileError';
    }
}
