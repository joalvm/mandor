import type { CurlNotice, CurlParse, RequestBody, RequestLine } from '@mandor/schema';

import { expandAnsiCQuotes } from './ansi-c-quotes.js';
import { fromCmdText } from './cmd-text.js';
import { authOf } from './curl-auth.js';
import { curlArgs, type CurlArg } from './curl-args.js';
import { curlBody } from './curl-body.js';
import { bodyPartsOf } from './curl-body-parts.js';
import { headerRowsOf } from './curl-header-rows.js';
import { methodOf } from './curl-method.js';
import { CurlParseError } from './curl-parse-error.js';
import { settingsOf } from './curl-settings.js';
import { curlTokens } from './curl-tokens.js';
import { curlUrl, isAddress, urlQueryRows } from './curl-url.js';
import { joinContinuations } from './line-continuations.js';
import { pastedCommand } from './pasted-command.js';
import { withPlainPunctuation } from './plain-punctuation.js';

const MULTIPART = /multipart\/form-data/i;

function isCurlCommand(word: string): boolean {
    const name = word.split(/[\\/]/).pop()?.toLowerCase();

    return name === 'curl' || name === 'curl.exe';
}

// A form goes as multipart with a boundary the sender draws: a multipart type the person wrote
// names another boundary, and is left out. Any other body keeps the headers as they are.
function sentHeaders(headers: RequestLine[], body: RequestBody): RequestLine[] {
    if (body.type !== 'form') {
        return headers;
    }

    return headers.filter(
        (header) => !(header.key.toLowerCase() === 'content-type' && MULTIPART.test(header.value)),
    );
}

function parsedOf(options: readonly CurlArg[], first: string, notices: CurlNotice[]): CurlParse {
    const url = curlUrl(first);
    const written = headerRowsOf(options);
    const { parts, get } = bodyPartsOf(options);
    const body = curlBody({ parts, get, headers: written.rows });
    const method = methodOf(options, parts.length > 0);
    const auth = authOf(options, url.user);
    const settings = settingsOf(options);
    const implied = [...written.rows, ...body.headers];

    return {
        kind: 'parsed',
        request: {
            method: method.method,
            url: url.url,
            query: [...url.query, ...urlQueryRows(options), ...body.query],
            headers: sentHeaders(implied, body.body),
            body: body.body,
            settings: settings.settings,
            ...(auth ? { auth } : {}),
        },
        notices: [
            ...notices,
            ...written.notices,
            ...body.notices,
            ...method.notices,
            ...settings.notices,
        ],
    };
}

/** What was copied, as bash would read it: what a page or another shell left there is gone. */
function asBashWouldRead(text: string): string {
    const command = withPlainPunctuation(fromCmdText(pastedCommand(text)));

    return joinContinuations(expandAnsiCQuotes(command));
}

function readCurl(text: string): CurlParse {
    const tokens = curlTokens(asBashWouldRead(text));
    const [command = '', ...words] = tokens.words;

    if (!isCurlCommand(command)) {
        throw new CurlParseError('notCurl');
    }

    const args = curlArgs(words);
    const first = args.urls.find(isAddress) ?? args.urls[0];

    if (first === undefined) {
        throw new CurlParseError('noUrl');
    }

    const extraUrls: CurlNotice[] = args.urls
        .filter((word) => word !== first)
        .map((subject) => ({ code: 'extraUrl', subject }));

    return parsedOf(args.options, first, [...tokens.notices, ...args.notices, ...extraUrls]);
}

/**
 * The request a pasted curl command describes, and what it said that the request could not keep.
 * Never throws: a command that cannot be read is a result that says why.
 */
export function curlRequestOf(text: string): CurlParse {
    try {
        return readCurl(text);
    } catch (error) {
        if (!(error instanceof CurlParseError)) {
            throw error;
        }

        return error.subject === undefined
            ? { kind: 'invalid', reason: error.reason }
            : { kind: 'invalid', reason: error.reason, subject: error.subject };
    }
}
