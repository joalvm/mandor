// A string between single quotes stays, a double quoted one goes apart because a backslash can end
// its line, and a backslash that is not a gap keeps the letter after it.
const PIECE =
    /'[^']*'|("(?:\\[\s\S]|[^"\\])*")|(\\[ \t]*(?:\r?\n|$)|(?<=\s)\\[ \t]+|`[ \t]*(?:\r?\n|$))|\\[\s\S]/g;
const ESCAPE_IN_DOUBLE = /\\(?:\r?\n|[\s\S])/g;

/** Inside double quotes the shell takes the backslash and the line break out, with no space. */
function joinedDouble(text: string): string {
    return text.replace(ESCAPE_IN_DOUBLE, (escape) => (escape.endsWith('\n') ? '' : escape));
}

/**
 * The command on one line, as the shell would read it and also as people paste it. Bash continues
 * a line with a backslash, and PowerShell with a backtick; a space left after either still means
 * that, and so does a backslash alone between two words, which is what remains of a line break
 * once a page or a chat flattens the command. `shell-quote` does not remove any of them.
 */
export function joinContinuations(text: string): string {
    return text.replace(PIECE, (piece: string, double?: string, gap?: string) => {
        if (gap !== undefined) {
            return ' ';
        }

        return double === undefined ? piece : joinedDouble(double);
    });
}
