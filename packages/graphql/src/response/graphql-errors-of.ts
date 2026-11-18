import { isRecord } from '../is-record.js';

/** What a GraphQL response says went wrong: how many errors, and the first messages. */
export type GraphqlErrors = { count: number; messages: string[] };

const MAX_MESSAGES = 20;

function messageOf(error: unknown): string[] {
    if (!isRecord(error) || typeof error['message'] !== 'string') {
        return [];
    }

    return [error['message']];
}

function parseBody(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

/**
 * The `errors` of a response body, or null when it has none. GraphQL answers a failed operation
 * with a 200, so the status alone does not tell: the body does.
 */
export function graphqlErrorsOf(text: string): GraphqlErrors | null {
    const body = parseBody(text);

    if (!isRecord(body)) {
        return null;
    }

    const errors = body['errors'];

    if (!Array.isArray(errors) || errors.length === 0) {
        return null;
    }

    return { count: errors.length, messages: errors.flatMap(messageOf).slice(0, MAX_MESSAGES) };
}
