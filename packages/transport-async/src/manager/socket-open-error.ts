import type { SocketFailureReason } from '../client/socket-failure-reason.js';

/**
 * A socket that ended before it opened. The reason decides what the window says; what the
 * libraries raised rides as the cause, and its words go in the message, for the log.
 */
export class SocketOpenError extends Error {
    constructor(
        readonly reason: SocketFailureReason,
        cause: unknown,
    ) {
        super(`the socket closed before it opened: ${wordsOf(cause, reason)}`, { cause });
        this.name = 'SocketOpenError';
    }
}

function wordsOf(cause: unknown, reason: SocketFailureReason): string {
    return cause instanceof Error ? cause.message : reason;
}
