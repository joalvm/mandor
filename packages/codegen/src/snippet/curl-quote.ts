/** The shells a curl command is written for: bash and its kin, and the Windows command prompt. */
export type CurlShell = 'bash' | 'cmd';

/** What bash spells by its letter inside `$'…'`; every other control character goes by its code. */
const ANSI_C_LETTERS: Readonly<Record<string, string>> = {
    '\\': '\\\\',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
};

/** The characters cmd lets through as they are: any other goes behind a caret. */
const CMD_UNSAFE = /[^a-zA-Z0-9\s_\-:=+~'/.,?;*`]/g;

/** A percent that cmd would read as the start of a variable. */
const CMD_VARIABLE = /%(?=[a-zA-Z0-9_])/g;

/** A `!` is history in an interactive bash, and a control character breaks the line it is on. */
const NEEDS_ANSI_C = /['!\p{Cc}]/u;

/** What changes inside `$'…'`: the backslash, the quote, `!` and every control character. */
const ANSI_C_CHANGED = /[\\'!\p{Cc}]/gu;

function ansiCOf(char: string): string {
    return ANSI_C_LETTERS[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
}

/**
 * A word for bash, the way DevTools quotes it: single quotes keep everything as typed, and a
 * word they cannot hold — a quote of their own, a `!`, a control character — goes in `$'…'`.
 */
function quoteBash(text: string): string {
    if (!NEEDS_ANSI_C.test(text)) {
        return `'${text}'`;
    }

    return `$'${text.replace(ANSI_C_CHANGED, ansiCOf)}'`;
}

/**
 * A word for cmd, the way DevTools quotes it. Two parsers read it: cmd, then the C runtime of
 * curl.exe. The backslash and the quote are escaped for the runtime first; then every character
 * cmd could act on goes behind a caret, the quotes around the word included, so cmd sees no
 * quoted stretch and the caret works everywhere. A percent before a name gets a caret after it,
 * so no variable is expanded, and a line break inside the word is a caret and two breaks.
 */
function quoteCmd(text: string): string {
    const escaped = text
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replace(CMD_UNSAFE, '^$&')
        .replace(CMD_VARIABLE, '%^')
        .replace(/\r?\n/g, '^\n\n');

    return `^"${escaped}^"`;
}

/** How each shell takes a word as one argument, whatever it holds. */
export const QUOTE_OF_SHELL: Readonly<Record<CurlShell, (text: string) => string>> = {
    bash: quoteBash,
    cmd: quoteCmd,
};
