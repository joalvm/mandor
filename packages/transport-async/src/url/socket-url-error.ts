/**
 * A url refused before any socket dials it. The message says why and names the host at most:
 * it reaches the log, and the refused url may hold a password the user typed into it.
 */
export class SocketUrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SocketUrlError';
    }
}
