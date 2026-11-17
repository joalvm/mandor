import { AuthTokenError } from '../auth-token-error.js';

/**
 * Names whatever a flow threw as the refusal the interface knows. An abort, however many layers
 * of the library wrapped it, is the person stopping; anything else is a token that did not come.
 */
export function tokenFailure(error: unknown): AuthTokenError {
    if (error instanceof AuthTokenError) {
        return error;
    }

    if (isAbort(error)) {
        return new AuthTokenError('auth-cancelled', 'the request was aborted');
    }

    return new AuthTokenError(
        'auth-token-failed',
        error instanceof Error ? error.message : String(error),
    );
}

function isAbort(error: unknown): boolean {
    return error instanceof Error && (error.name === 'AbortError' || isAbort(error.cause));
}
