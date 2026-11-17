const DOUBLE = '\u201c\u201d\u201e';
const SINGLE = '\u2018\u2019\u201a';
const SPACE = '\u00a0\u2000-\u200a\u202f\u3000';
const INVISIBLE = '\u200b-\u200d\u2060\ufeff';
const DASH = '\u2010-\u2015\u2212';

// What the shell already reads goes first and stays: an escape and a string between straight
// quotes, whose curly quotes and dashes are the person's text.
const PIECE = new RegExp(
    [
        String.raw`\\[\s\S]`,
        `'[^']*'`,
        String.raw`"(?:\\[\s\S]|[^"\\])*"`,
        `[${DOUBLE}][^${DOUBLE}]*[${DOUBLE}]`,
        `[${SINGLE}][^${SINGLE}]*[${SINGLE}]`,
        `[${SPACE}]`,
        `[${INVISIBLE}]`,
        String.raw`(?<!\S)[${DASH}]+(?=\S)`,
    ].join('|'),
    'gu',
);
const IS_DOUBLE = new RegExp(`^[${DOUBLE}]`, 'u');
const IS_SINGLE = new RegExp(`^[${SINGLE}]`, 'u');
const IS_SPACE = new RegExp(`^[${SPACE}]$`, 'u');
const IS_INVISIBLE = new RegExp(`^[${INVISIBLE}]$`, 'u');
const IS_DASH = new RegExp(`^[${DASH}]`, 'u');
/** One letter and then no lower case: `-H`, `-XPOST`, `-sS`. A run of them is a long name. */
const SHORT_OPTION = /^[A-Za-z0-9#](?![a-z])/;

function inner(piece: string): string {
    return piece.slice(1, -1);
}

function doubleQuoted(piece: string): string {
    return `"${inner(piece).replaceAll('"', '\\"')}"`;
}

function singleQuoted(piece: string): string {
    return `'${inner(piece).replaceAll("'", "'\\''")}'`;
}

/** A word processor makes a dash of `--`, and of the `-` that starts a word. */
function dashes(piece: string, rest: string): string {
    return piece.length === 1 && piece !== '\u2014' && SHORT_OPTION.test(rest) ? '-' : '--';
}

/** What each kind of piece becomes, by the sign that gives it away. */
const PLAIN_OF: readonly (readonly [RegExp, (piece: string, rest: string) => string])[] = [
    [IS_DOUBLE, doubleQuoted],
    [IS_SINGLE, singleQuoted],
    [IS_SPACE, () => ' '],
    [IS_INVISIBLE, () => ''],
    [IS_DASH, dashes],
];

/**
 * A command that went through a page, a chat or a word processor, with the punctuation the shell
 * reads: curly quotes as quotes, a no-break space as a space, a long dash as the dashes of an
 * option. Only outside a string between straight quotes.
 */
export function withPlainPunctuation(text: string): string {
    return text.replace(PIECE, (piece: string, offset: number) => {
        const plain = PLAIN_OF.find(([sign]) => sign.test(piece))?.[1];

        return plain === undefined ? piece : plain(piece, text.slice(offset + piece.length));
    });
}
