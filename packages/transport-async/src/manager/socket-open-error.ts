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

/**
 * What the libraries raised, in words, and never none: Node fails a name with several addresses
 * with an aggregate that has no message, so the words are those of each attempt, each once.
 */
function wordsOf(cause: unknown, reason: SocketFailureReason): string {
    const attempts: readonly unknown[] = cause instanceof AggregateError ? cause.errors : [];
    const said = [cause, ...attempts].flatMap((one) =>
        one instanceof Error ? [one.message.trim()] : [],
    );
    const words = [...new Set(said.filter((line) => line !== ''))];

    return words.length > 0 ? words.join('; ') : reason;
}
