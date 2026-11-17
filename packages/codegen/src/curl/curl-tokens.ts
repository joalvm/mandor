import type { CurlNotice } from '@mandor/schema';
import { parse, type ParseEntry } from 'shell-quote';

import { CurlParseError } from './curl-parse-error.js';

const SHELL_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Always a string: a function that returned an object would split the word in pieces. A shell
// variable becomes the placeholder Mandor resolves against an environment.
function placeholderOf(key: string): string {
    return SHELL_NAME.test(key) ? `{{${key}}}` : `$${key}`;
}

function entriesOf(text: string): ParseEntry[] {
    try {
        return parse(text, placeholderOf);
    } catch {
        throw new CurlParseError('syntax');
    }
}

function wordOf(entry: ParseEntry): string | null {
    if (typeof entry === 'string') {
        return entry;
    }

    return 'op' in entry && entry.op === 'glob' ? entry.pattern : null;
}

/**
 * The words of the command, read by `shell-quote`. It stops at the first operator or comment,
 * because what comes after is another command and not an argument of curl.
 */
export function curlTokens(text: string): { words: string[]; notices: CurlNotice[] } {
    const words: string[] = [];
    const notices: CurlNotice[] = [];

    for (const entry of entriesOf(text)) {
        const word = wordOf(entry);

        if (word === null) {
            notices.push({
                code: typeof entry === 'object' && 'comment' in entry ? 'comment' : 'moreCommands',
            });
            break;
        }

        words.push(word);
    }

    return { words, notices };
}
