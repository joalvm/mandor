import { tooShortToHide } from './too-short-to-hide.js';

/** What stands where a secret was. One fixed marker, so a reader knows what happened. */
export const REDACTED = '[redacted]';

/**
 * The spellings a secret takes inside a URL, longest first: the value as the keychain keeps it,
 * as a path segment (`encodeURIComponent`) and as a query value (`URLSearchParams`, where a
 * space is `+`). A shorter spelling can be a piece of a longer one, so the longest goes first
 * and the shorter finds nothing left of it to eat.
 */
export function spellingsOf(secret: string): string[] {
    const asQuery = new URLSearchParams([['', secret]]).toString().slice(1);

    return [...new Set([secret, encodeURIComponent(secret), asQuery])].sort(
        (first, second) => second.length - first.length,
    );
}

/**
 * Every text a list of secrets is hidden by: the spellings of each value long enough to hide,
 * the longest of each value first. A value under the threshold is left out: see
 * `tooShortToHide`. Worked out once for a list, so a tree of many texts is searched without
 * spelling every secret again for each one.
 */
export function spellingsToHide(secrets: readonly string[]): string[] {
    return secrets.filter((secret) => !tooShortToHide(secret)).flatMap(spellingsOf);
}

/**
 * Replaces each spelling in the text with the marker, in the order given. The substitution is
 * literal —`split` and `join`, never a pattern built from the value— because a token carrying
 * `(` or `.` would otherwise decide what the pattern matches, which is the opposite of hiding it.
 */
export function redactSpellings(text: string, spellings: readonly string[]): string {
    let redacted = text;

    for (const spelling of spellings) {
        if (redacted.includes(spelling)) {
            redacted = redacted.split(spelling).join(REDACTED);
        }
    }

    return redacted;
}

/** Replaces every secret value in the text with the marker, in the three spellings of a URL. */
export function redact(text: string, secrets: readonly string[]): string {
    return redactSpellings(text, spellingsToHide(secrets));
}
