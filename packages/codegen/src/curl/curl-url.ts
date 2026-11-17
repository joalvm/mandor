import type { RequestLine } from '@mandor/schema';

import type { CurlArg } from './curl-args.js';

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const USER_INFO = /^((?:[a-z][a-z0-9+.-]*:\/\/)?)([^/?#]*)@/i;
const ESCAPED_SIGN = /\\([^A-Za-z0-9\\{}])/g;
const LINE_BREAK = /\\?[ \t]*\r?\n[ \t]*/g;
const WRAPPING_QUOTES = /^["']|["']$/g;

/** Who the URL itself names, before the host. */
export type UrlUser = { username: string; password: string };

function row(key: string, value: string): RequestLine {
    return { key: key.trim(), value, enabled: true };
}

/** An address has no line breaks and no backslashes: what a shell or a page left there goes. */
function plainAddress(raw: string): string {
    return raw
        .replace(LINE_BREAK, '')
        .replace(ESCAPED_SIGN, '$1')
        .trim()
        .replace(WRAPPING_QUOTES, '');
}

function decoded(text: string): string {
    try {
        return decodeURIComponent(text);
    } catch {
        return text;
    }
}

function userOf(info: string): UrlUser {
    const colon = info.indexOf(':');

    return colon < 0
        ? { username: decoded(info), password: '' }
        : { username: decoded(info.slice(0, colon)), password: decoded(info.slice(colon + 1)) };
}

/** The address without the user it names, who belongs to the auth. */
function splitUser(address: string): { address: string; user?: UrlUser } {
    const found = USER_INFO.exec(address);

    if (found === null) {
        return { address };
    }

    return { address: address.replace(USER_INFO, '$1'), user: userOf(String(found[2])) };
}

/** Whether a word no option took says where to go, more than any other word would. */
export function isAddress(word: string): boolean {
    return HAS_SCHEME.test(plainAddress(word)) || word.startsWith('{{');
}

/**
 * The URL curl was given, clean, with the query moved to rows and the user apart. A host with no
 * scheme gets `http://`, curl's default, unless it starts with a placeholder that may bring its
 * own. The fragment is never sent, so it goes.
 */
export function curlUrl(raw: string): { url: string; query: RequestLine[]; user?: UrlUser } {
    const [withoutFragment = ''] = plainAddress(raw).split('#', 1);
    const mark = withoutFragment.indexOf('?');
    const written = mark < 0 ? withoutFragment : withoutFragment.slice(0, mark);
    const params = mark < 0 ? '' : withoutFragment.slice(mark + 1);
    const { address, user } = splitUser(written);
    const complete = HAS_SCHEME.test(address) || address.startsWith('{{');

    return {
        url: complete ? address : `http://${address}`,
        query: [...new URLSearchParams(params)].map(([key, value]) => row(key, value)),
        ...(user ? { user } : {}),
    };
}

/** A `--url-query`: `name=value` as it reads, the `+` that asks curl not to encode it, or a name. */
function urlQueryRow(value: string): RequestLine {
    const text = value.replace(/^\+/, '');
    const equals = text.indexOf('=');

    return equals < 0 ? row(text, '') : row(text.slice(0, equals), text.slice(equals + 1));
}

/** The params the command adds to its URL one by one with `--url-query`. */
export function urlQueryRows(args: readonly CurlArg[]): RequestLine[] {
    return args.flatMap((arg) =>
        arg.name === 'url-query' && arg.value !== null ? [urlQueryRow(arg.value)] : [],
    );
}
