// What people leave before the command when they copy it: a backtick, a prompt, sudo, a variable.
const DECORATION = String.raw`[\s\x60]*(?:[$>%#\u276f]\s+)?(?:sudo\s+)?(?:[A-Za-z_]\w*=\S*\s+)*`;
// The name of the program, on its own or at the end of a path that may be between quotes.
const COMMAND = String.raw`(?:['"][^'"\n]*[\\/]|\S*[\\/])?curl(?:\.exe)?['"]?(?=\s|$|\x60)`;
const COMMAND_LINE = new RegExp(`^${DECORATION}(?=${COMMAND})`, 'im');

/**
 * The text from the word that runs curl on, whatever came before it, or null when no line of the
 * text runs it. The window asks this to know a paste is a command, and main to start reading.
 */
export function curlCommandFrom(text: string): string | null {
    const found = COMMAND_LINE.exec(text);

    return found === null ? null : text.slice(found.index + found[0].length);
}
