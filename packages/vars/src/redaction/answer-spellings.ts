import { spellingsOf } from './redact.js';

function base64Of(secret: string): string {
    return btoa(String.fromCharCode(...new TextEncoder().encode(secret)));
}

/** A value and how a server may have written it back: URL, base64 in both alphabets, JSON. */
function echoesOf(secret: string): string[] {
    const base64 = base64Of(secret);
    const unpadded = base64.replace(/=+$/u, '');

    return [
        ...spellingsOf(secret),
        base64,
        unpadded,
        unpadded.replaceAll('+', '-').replaceAll('/', '_'),
        JSON.stringify(secret).slice(1, -1),
    ];
}

/**
 * Every text a list of secrets is hidden by in what a server answered, when that answer is on its
 * way to a file others read. Unlike `spellingsToHide` it has no shortest value: a secret `123`
 * takes every `123` of the answer with it, the price of a value marked secret never reaching
 * anyone. The longest of all goes first, so a shorter one finds nothing left of it to eat.
 */
export function answerSpellings(secrets: readonly string[]): string[] {
    const spellings = new Set(secrets.filter((secret) => secret !== '').flatMap(echoesOf));

    return [...spellings].sort((first, second) => second.length - first.length);
}
