/**
 * A certificate the network settings name could not be read: moved, deleted, or not readable by
 * this user. The request does not go without it — trusting less, or showing no certificate,
 * would be a different request than the one the settings describe.
 */
export class NetworkFileError extends Error {
    constructor(path: string, cause: unknown) {
        super(`the certificate ${path} could not be read`, { cause });
        this.name = 'NetworkFileError';
    }
}
