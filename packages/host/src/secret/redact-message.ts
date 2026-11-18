import { answerSpellings, redact, redactSpellings, spellingsToHide } from '@mandor/vars';

import { sessionSecrets } from './session-secrets.js';

/**
 * Hides every secret value inside a message, however deep it sits. The message on its way out
 * is a tree of unknown shape —a frame, a batch of activity, the answer of a channel—, so the
 * whole tree is walked instead of naming the fields that might carry a token.
 *
 * It takes the values from the session and not from its caller: an edge cannot be talked into
 * redacting against an empty list. A message that spells no secret leaves as it came: every
 * answer and every push of the window goes through here, and once the session held one secret
 * each of them was copied whole — a tree of 20 000 items, 40 ms and as many megabytes per answer
 * to hide nothing. It is read first, without copying, and copied only when something must go.
 */
export function redactMessage(message: unknown): unknown {
    const spellings = spellingsToHide(sessionSecrets());

    if (spellings.length === 0 || !spellsAny(message, spellings)) {
        return message;
    }

    return redactAgainst(message, spellings);
}

/**
 * The same hiding, for a document of a format while it is still data: an object in, an object
 * with the same keys out, so the format can still write it as its text.
 */
export function redactedDocument(document: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(document).map(([name, value]) => [name, redactMessage(value)]),
    );
}

/** The same hiding, for the file that leaves as one text. */
export function redactedText(text: string): string {
    return redact(text, sessionSecrets());
}

/**
 * The hiding for what a server answered, on its way to a file others read: every secret of the
 * session, of any length and however the server wrote it back. The spellings are worked out once.
 */
export function answerRedactor(): (text: string) => string {
    const spellings = answerSpellings(sessionSecrets());

    return (text) => redactSpellings(text, spellings);
}

/** Whether some text inside the message holds one of the spellings, read without a copy. */
function spellsAny(message: unknown, spellings: readonly string[]): boolean {
    if (typeof message === 'string') {
        return spellings.some((spelling) => message.includes(spelling));
    }

    if (Array.isArray(message)) {
        return message.some((entry: unknown) => spellsAny(entry, spellings));
    }

    if (typeof message === 'object' && message !== null) {
        return Object.values(message).some((value: unknown) => spellsAny(value, spellings));
    }

    return false;
}

function redactAgainst(message: unknown, spellings: readonly string[]): unknown {
    if (typeof message === 'string') {
        return redactSpellings(message, spellings);
    }

    if (Array.isArray(message)) {
        return message.map((entry: unknown) => redactAgainst(entry, spellings));
    }

    if (typeof message === 'object' && message !== null) {
        return Object.fromEntries(
            Object.entries(message).map(([name, value]: [string, unknown]) => [
                name,
                redactAgainst(value, spellings),
            ]),
        );
    }

    return message;
}
