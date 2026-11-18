type Header = readonly [string, string];

/** The parameters of a Digest challenge, by lower-case name: `realm`, `nonce`, `qop`… */
export type DigestChallenge = Record<string, string>;

/** Where a Digest challenge starts: the start of the header, or after a comma of another one. */
const DIGEST_START = /(?:^|,)\s*digest\s+/i;

/**
 * One `name=value` of the challenge, quoted or bare, after an optional comma. Sticky: it stops
 * at the name of the next scheme, which no `=` follows.
 */
const PARAMETER = /\s*,?\s*([\w-]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,"]*))/y;

function parametersFrom(text: string, from: number): DigestChallenge {
    const parameters: DigestChallenge = {};

    PARAMETER.lastIndex = from;

    for (let match = PARAMETER.exec(text); match !== null; match = PARAMETER.exec(text)) {
        const [, name, quoted, bare] = match;

        parameters[String(name).toLowerCase()] =
            quoted === undefined ? String(bare) : quoted.replace(/\\(.)/g, '$1');
    }

    return parameters;
}

/**
 * The Digest challenge a 401 carries in its `WWW-Authenticate`, wherever it sits among the
 * challenges of other schemes; nothing when the server asks for none.
 */
export function digestChallengeOf(headers: readonly Header[]): DigestChallenge | undefined {
    const challenges = headers.filter(([name]) => name.toLowerCase() === 'www-authenticate');

    for (const [, value] of challenges) {
        const start = DIGEST_START.exec(value);

        if (start !== null) {
            return parametersFrom(value, start.index + start[0].length);
        }
    }

    return undefined;
}
