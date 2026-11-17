import { curlCommandFrom } from '@mandor/schema';

const FENCED = /^\s*(`{1,3})(?:[a-z]*\r?\n)?([\s\S]*?)\1\s*$/i;
/** Where the program lives says nothing, and a shell would eat the backslashes of the path. */
const PATH_OF_PROGRAM = /^(?:['"][^'"\n]*[\\/]|\S*[\\/])(curl(?:\.exe)?)['"]?(?=\s|$)/i;

/**
 * The command inside what was copied: without the code fence of a page and without what comes
 * before it (a prompt, sudo, a comment, an export). Text with no command stays as it came, for
 * the reader to say so.
 */
export function pastedCommand(text: string): string {
    const bare = text.replace(FENCED, '$2');

    return (curlCommandFrom(bare) ?? bare).replace(PATH_OF_PROGRAM, '$1');
}
