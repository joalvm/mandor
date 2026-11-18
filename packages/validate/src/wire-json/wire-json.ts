import { createScanner } from 'jsonc-parser';

/**
 * The kinds of the scanner this reads, by number. `SyntaxKind` is a const enum, which an isolated
 * build cannot read at run time, so its values are said here and read as plain numbers.
 */
const KIND = {
    closeBrace: 2,
    closeBracket: 4,
    comma: 5,
    lineComment: 12,
    blockComment: 13,
    lineBreak: 14,
    trivia: 15,
    eof: 17,
} as const;

type Token = { kind: number; offset: number; text: string };

const COMMENTS: ReadonlySet<number> = new Set([KIND.lineComment, KIND.blockComment]);

const TRIVIA: ReadonlySet<number> = new Set([KIND.trivia, KIND.lineBreak]);

const CLOSERS: ReadonlySet<number> = new Set([KIND.closeBrace, KIND.closeBracket]);

/**
 * The JSON a JSONC text sends. The comments and the trailing commas are for the human typing,
 * never for the wire, so both leave, and nothing else changes: the spacing and the placeholders
 * travel as authored. Commenting out the last member of an object leaves the comma of the one
 * before it hanging, and a server reading JSON refuses it. The cut is the parser's own scanner,
 * which knows a string from a comment, so it also cleans a text that does not parse yet — a
 * placeholder written without quotes, say, which only reads as JSON once it is filled.
 */
export function wireJson(text: string): string {
    return sentTokens(text)
        .map((token) => token.text)
        .join('');
}

/**
 * The JSON a JSONC text sends, on one line: what `wireJson` sends, without the spacing between
 * its tokens. A command written out for a shell reads best whole, and a line break inside a quoted
 * word travels only in a quoting that spells it `\n`. The spaces a string holds are its text, and stay.
 */
export function compactJson(text: string): string {
    return sentTokens(text)
        .filter((token) => !TRIVIA.has(token.kind))
        .map((token) => token.text)
        .join('');
}

function sentTokens(text: string): Token[] {
    const spoken = spokenTokens(text);
    const trailing = new Set(trailingOf(spoken));

    return spoken.filter((token) => !trailing.has(token.offset));
}

/**
 * Where each comma sits that nothing but a closer follows, comments aside. JSON refuses it, so
 * the editor says so over the comma while the wire drops it.
 */
export function trailingCommas(text: string): number[] {
    return trailingOf(spokenTokens(text));
}

function spokenTokens(text: string): Token[] {
    const scanner = createScanner(text, false);
    const tokens: Token[] = [];

    for (let kind: number = scanner.scan(); kind !== KIND.eof; kind = scanner.scan()) {
        const offset = scanner.getTokenOffset();

        if (!COMMENTS.has(kind)) {
            tokens.push({
                kind,
                offset,
                text: text.slice(offset, offset + scanner.getTokenLength()),
            });
        }
    }

    return tokens;
}

/** Walks back from the end, so every comma already knows what comes after it. */
function trailingOf(tokens: readonly Token[]): number[] {
    const found: number[] = [];
    let next: number | null = null;

    for (const token of tokens.toReversed()) {
        if (token.kind === KIND.comma && next !== null && CLOSERS.has(next)) {
            found.push(token.offset);

            continue;
        }

        if (!TRIVIA.has(token.kind)) {
            next = token.kind;
        }
    }

    return found.reverse();
}
