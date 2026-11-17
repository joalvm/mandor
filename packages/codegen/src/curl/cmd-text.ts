/** A caret that ends a line, or one that opens a quote: nothing else of a paste writes those. */
const WRITTEN_FOR_CMD = /\^\r?\n|(?:^|\s)\^"/;
/** A string between plain quotes, where cmd leaves carets alone, or a caret and what it escapes. */
const PIECE = /"[^"]*"|\^(?:\r?\n){1,2}|\^[\s\S]?|\$/g;

/** Bash would read a dollar as a variable: in cmd it is a letter. */
function letter(text: string): string {
    return text.replaceAll('$', '\\$');
}

function afterCaret(rest: string): string {
    if (/^(?:\r?\n){2}$/.test(rest)) {
        return '\n';
    }

    return /^\r?\n$/.test(rest) ? ' ' : letter(rest);
}

/** A caret before an ampersand means an escape, even where cmd would keep it. */
function pieceOf(piece: string): string {
    return piece.startsWith('^') ? afterCaret(piece.slice(1)) : letter(piece).replaceAll('^&', '&');
}

/**
 * A command written for cmd as bash would write it, because that is what the reader knows.
 * Chrome's «Copy as cURL (cmd)» escapes nearly every sign with a caret, opens its strings with
 * `^"`, ends a line with `^` and writes a line break inside a value as `^` and two breaks.
 */
export function fromCmdText(text: string): string {
    return WRITTEN_FOR_CMD.test(text) ? text.replace(PIECE, pieceOf) : text;
}
