import type { CurlNotice, RequestLine } from '@mandor/schema';

import type { CurlArg } from './curl-args.js';

type Rows = { rows: RequestLine[]; notices: CurlNotice[] };

function row(key: string, value: string): RequestLine {
    return { key, value, enabled: true };
}

/** `Name: value`, `Name;` (sent empty) or `Name:` (curl removes it). Returns null for nothing. */
function parseHeader(text: string): [string, string] | null | undefined {
    const colon = text.indexOf(':');

    if (colon >= 0) {
        const value = text.slice(colon + 1).trim();

        return value === '' ? null : [text.slice(0, colon).trim(), value];
    }

    return text.endsWith(';') ? [text.slice(0, -1).trim(), ''] : undefined;
}

function addHeader(text: string, found: Rows): void {
    if (text.startsWith('@')) {
        found.notices.push({ code: 'headerFile', subject: text.slice(1) });

        return;
    }

    const parsed = parseHeader(text);

    if (parsed === undefined) {
        found.notices.push({ code: 'unsupportedOption', subject: '--header' });

        return;
    }

    if (parsed !== null) {
        found.rows.push(row(parsed[0], parsed[1]));
    }
}

function addUserAgent(value: string, found: Rows): void {
    found.rows.push(row('User-Agent', value));
}

// `;auto` asks curl to set the referer again on each redirect; the header is the address alone.
function addReferer(value: string, found: Rows): void {
    found.rows.push(row('Referer', value.replace(/;auto$/, '')));
}

// A cookie of `-b` joins the Cookie header already written, because a request sends one.
function addCookie(value: string, found: Rows): void {
    if (!value.includes('=')) {
        found.notices.push({ code: 'cookieFile', subject: value });

        return;
    }

    const written = found.rows.find((header) => header.key.toLowerCase() === 'cookie');

    if (written === undefined) {
        found.rows.push(row('Cookie', value));

        return;
    }

    written.value = `${written.value}; ${value}`;
}

/** `-r` names the bytes; the header says what they count. */
function addRange(value: string, found: Rows): void {
    found.rows.push(row('Range', `bytes=${value}`));
}

/** What each header option adds, by its name; the other options are not headers. */
const HEADER_OF_OPTION: ReadonlyMap<string, (value: string, found: Rows) => void> = new Map([
    ['header', addHeader],
    ['user-agent', addUserAgent],
    ['referer', addReferer],
    ['cookie', addCookie],
    ['range', addRange],
]);

/** The headers of `-H`, `-A`, `-e`, `-b` and `-r`, in the order the command wrote them. */
export function headerRowsOf(args: readonly CurlArg[]): Rows {
    const found: Rows = { rows: [], notices: [] };

    for (const { name, value } of args) {
        if (value !== null) {
            HEADER_OF_OPTION.get(name)?.(value, found);
        }
    }

    return found;
}
