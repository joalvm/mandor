/** What a stretch of code is, so the lines of a clash can be read in colour. */
export type CodeTokenKind = 'key' | 'literal' | 'number' | 'plain' | 'punctuation' | 'string';

export type CodeToken = { kind: CodeTokenKind; text: string };

const JSON_TOKEN =
    /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;
const ROW = /^([^\s:{"[]+)(: )(.*)$/;

/** The stretches one match of the grammar stands for: a name or a string, a number, a literal, a mark. */
function tokensOf(
    whole: string,
    quoted: string | undefined,
    colon: string | undefined,
    scalar: string | undefined,
): CodeToken[] {
    if (quoted !== undefined) {
        const head: CodeToken = { kind: colon === undefined ? 'string' : 'key', text: quoted };

        return colon === undefined ? [head] : [head, { kind: 'punctuation', text: colon }];
    }

    if (scalar === undefined) {
        return [{ kind: 'punctuation', text: whole }];
    }

    return [{ kind: /^[-\d]/.test(scalar) ? 'number' : 'literal', text: scalar }];
}

function jsonTokens(text: string): CodeToken[] {
    const tokens: CodeToken[] = [];
    let last = 0;

    for (const match of text.matchAll(JSON_TOKEN)) {
        const [whole, quoted, colon, number, literal] = match;

        if (match.index > last) {
            tokens.push({ kind: 'plain', text: text.slice(last, match.index) });
        }

        tokens.push(...tokensOf(whole, quoted, colon, number ?? literal));

        last = match.index + whole.length;
    }

    return last < text.length ? [...tokens, { kind: 'plain', text: text.slice(last) }] : tokens;
}

/**
 * Splits the text of a side into coloured stretches. A line of a list (`Accept: text/html`) is a
 * name and its value; anything laid out as JSON is cut by its own grammar; any other short value
 * (an address, a method) reads whole as a string. No parsing of what the text means: only what it
 * looks like, which is all a colour needs.
 */
export function tokenizeCode(text: string, block: boolean): CodeToken[] {
    // A short body is not laid out in a block, but it is still JSON when it opens like it.
    if (block || /^\s*[{[]/.test(text)) {
        return jsonTokens(text);
    }

    const row = ROW.exec(text);

    if (row !== null) {
        const [, key = '', colon = '', value = ''] = row;

        return [
            { kind: 'key', text: key },
            { kind: 'punctuation', text: colon },
            { kind: 'string', text: value },
        ];
    }

    return [{ kind: 'string', text }];
}
