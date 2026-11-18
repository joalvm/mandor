import type { CurlNotice } from '@mandor/schema';

import { CURL_OPTIONS, CURL_SHORT_OPTIONS, type CurlOption } from './curl-options.js';
import { CurlParseError } from './curl-parse-error.js';
import { withoutShellEscapes } from './shell-escapes.js';

/** An option that changes the request, with the text as it was written (`flag`) for the notices. */
export type CurlArg = { name: string; flag: string; value: string | null };

type Reading = { options: CurlArg[]; urls: string[]; notices: CurlNotice[] };

/** The options whose value is a field and not a body: an escape left there is not part of it. */
const FIELD_OPTIONS: ReadonlySet<string> = new Set([
    'header',
    'user',
    'user-agent',
    'referer',
    'cookie',
    'request',
    'oauth2-bearer',
    'url-query',
    'range',
]);

/** An option curl has and Mandor does not honour: named, so the person knows it was left out. */
function noticeUnsupported(arg: CurlArg, reading: Reading): void {
    reading.notices.push({ code: 'unsupportedOption', subject: arg.flag });
}

/** An option that changes the request. `--url` names one more URL, as a bare word does. */
function keepArg(arg: CurlArg, reading: Reading): void {
    if (arg.name === 'url' && arg.value !== null) {
        reading.urls.push(arg.value);

        return;
    }

    reading.options.push(
        arg.value !== null && FIELD_OPTIONS.has(arg.name)
            ? { ...arg, value: withoutShellEscapes(arg.value) }
            : arg,
    );
}

/** What an option leaves once read: a notice, a part of the request, or nothing at all. */
const RECORD_OF_KIND: Readonly<
    Record<CurlOption['kind'], (arg: CurlArg, reading: Reading) => void>
> = {
    unsupported: noticeUnsupported,
    read: keepArg,
    silent: () => undefined,
};

function record(option: CurlOption, flag: string, value: string | null, reading: Reading): void {
    RECORD_OF_KIND[option.kind]({ name: option.name, flag, value }, reading);
}

/** Where the value of an option can be: glued to its letter, or else the next word. */
type Slot = { flag: string; glued: string; next: string | undefined };

/** Reads the value of an option, and says how many words after it that took. */
function apply(option: CurlOption, slot: Slot, reading: Reading): number {
    const { flag, glued, next } = slot;

    if (!option.takesValue) {
        record(option, flag, null, reading);

        return 0;
    }

    const value = glued === '' ? next : glued;

    if (value === undefined) {
        throw new CurlParseError('missingArgument', flag);
    }

    record(option, flag, value, reading);

    return glued === '' ? 1 : 0;
}

/** `--name=value`, which curl refuses and every page writes. The whole word goes first. */
function readGlued(word: string, reading: Reading): void {
    const equals = word.indexOf('=');
    const option = equals < 0 ? undefined : CURL_OPTIONS.get(word.slice(2, equals));

    if (option === undefined) {
        reading.notices.push({ code: 'unknownOption', subject: word });

        return;
    }

    const value = option.takesValue ? word.slice(equals + 1) : null;

    record(option, word.slice(0, equals), value, reading);
}

function readLong(words: readonly string[], index: number, word: string, reading: Reading): number {
    const option = CURL_OPTIONS.get(word.slice(2));

    if (option === undefined) {
        readGlued(word, reading);

        return 0;
    }

    return apply(option, { flag: word, glued: '', next: words[index + 1] }, reading);
}

function readShort(
    words: readonly string[],
    index: number,
    word: string,
    reading: Reading,
): number {
    for (let at = 1; at < word.length; at += 1) {
        const flag = `-${word.charAt(at)}`;
        const option = CURL_OPTIONS.get(CURL_SHORT_OPTIONS.get(word.charAt(at)) ?? '');

        if (option === undefined) {
            reading.notices.push({ code: 'unknownOption', subject: flag });

            continue;
        }

        if (option.takesValue) {
            return apply(
                option,
                { flag, glued: word.slice(at + 1), next: words[index + 1] },
                reading,
            );
        }

        record(option, flag, null, reading);
    }

    return 0;
}

type WordReader = (words: readonly string[], index: number, reading: Reading) => number;

/** The words that mean the same wherever they come. After `--` every word is a URL. */
const READ_OF_WORD: ReadonlyMap<string, WordReader> = new Map<string, WordReader>([
    [
        '--',
        (words, index, reading) => {
            reading.urls.push(...words.slice(index + 1).filter((word) => word.trim() !== ''));

            return words.length - index - 1;
        },
    ],
    [
        '-',
        (_words, _index, reading) => {
            reading.notices.push({ code: 'unknownOption', subject: '-' });

            return 0;
        },
    ],
]);

/** A word no option took: a blank, a lone dash, a long option, a run of letters, or else a URL. */
function readWord(words: readonly string[], index: number, word: string, reading: Reading): number {
    if (word.trim() === '') {
        return 0;
    }

    const read = READ_OF_WORD.get(word);

    if (read !== undefined) {
        return read(words, index, reading);
    }

    if (word.startsWith('--')) {
        return readLong(words, index, word, reading);
    }

    if (word.startsWith('-')) {
        return readShort(words, index, word, reading);
    }

    reading.urls.push(word);

    return 0;
}

/**
 * The options and URLs of the words after `curl`, in `--name value` and in `--name=value`. An
 * unknown option does not consume the word after it, so a URL is not lost to a letter nobody knew.
 */
export function curlArgs(words: readonly string[]): Reading {
    const reading: Reading = { options: [], urls: [], notices: [] };

    let consumed = 0;

    for (const [index, word] of words.entries()) {
        if (consumed > 0) {
            consumed -= 1;

            continue;
        }

        consumed = readWord(words, index, word, reading);
    }

    return reading;
}
