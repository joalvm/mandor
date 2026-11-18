import type { CurlNotice, RequestBody, RequestLine } from '@mandor/schema';

import { isFormPart, type BodyPart, type DataPart } from './curl-body-part.js';
import { dataPieceOf, type DataPiece } from './curl-data.js';
import { typedBody } from './curl-body-type.js';
import { formBody } from './curl-form.js';
import { headerValue } from './curl-headers.js';
import { isRepoFilePath } from './repo-file-path.js';
import { withoutShellEscapes } from './shell-escapes.js';

export type CurlBodyInput = {
    parts: readonly BodyPart[];
    /** Whether `-G` was there: the data goes to the query and the body is empty. */
    get: boolean;
    /** The headers the person wrote, to know which of the implied ones are missing. */
    headers: readonly RequestLine[];
};

/** The body, and what it adds: headers and query rows, and what had to be left out. */
export type CurlBodyResult = {
    body: RequestBody;
    headers: RequestLine[];
    query: RequestLine[];
    notices: CurlNotice[];
};

const NONE: RequestBody = { type: 'none' };

function rowsOf(pairs: Iterable<[string, string]>): RequestLine[] {
    return [...pairs].map(([key, value]) => ({ key, value, enabled: true }));
}

function missingFrom(pairs: [string, string][], written: readonly RequestLine[]): RequestLine[] {
    return rowsOf(pairs.filter(([name]) => headerValue(written, name) === null));
}

// A single file of the repo is the body as it is. The copy is the person's: the request only
// names it, and says so.
function binaryResult(
    piece: Extract<DataPiece, { kind: 'file' }>,
    written: readonly RequestLine[],
): CurlBodyResult {
    const type = piece.json ? 'application/json' : 'application/x-www-form-urlencoded';

    return {
        body: { type: 'binary', file: piece.path },
        headers: missingFrom([['Content-Type', type]], written),
        query: [],
        notices: [{ code: 'dataFileCopy', subject: piece.path }],
    };
}

function dataResult(parts: readonly DataPart[], input: CurlBodyInput): CurlBodyResult {
    const pieces = parts.map(dataPieceOf);
    const [first] = pieces;

    if (!input.get && pieces.length === 1 && first?.kind === 'file' && isRepoFilePath(first.path)) {
        return binaryResult(first, input.headers);
    }

    const notices = pieces
        .filter((piece) => piece.kind === 'file')
        .map((piece): CurlNotice => ({ code: 'dataFile', subject: piece.path }));
    const texts = pieces.filter((piece) => piece.kind === 'text');
    const text = texts
        .map((piece) => piece.text)
        .join(texts.every((piece) => piece.json) ? '' : '&');

    if (texts.length === 0) {
        return { body: NONE, headers: [], query: [], notices };
    }

    if (input.get) {
        const query = rowsOf(new URLSearchParams(withoutShellEscapes(text)));

        return { body: NONE, headers: [], query, notices };
    }

    const contentType = headerValue(input.headers, 'content-type') ?? '';
    const typed = typedBody({ text, json: texts.some((piece) => piece.json), contentType });

    return {
        body: typed.body,
        headers: missingFrom(typed.headers, input.headers),
        query: [],
        notices,
    };
}

/**
 * The body a curl command describes, from the options that name one. A form wins over data: they
 * are two ways to send a body and curl would refuse both. `-G` turns the data into query.
 */
export function curlBody(input: CurlBodyInput): CurlBodyResult {
    const form = input.parts.filter(isFormPart);
    const data = input.parts.filter((part) => !isFormPart(part));

    if (form.length === 0) {
        return dataResult(data, input);
    }

    const { body, notices } = formBody(form);
    const mixed: CurlNotice[] = data.length > 0 ? [{ code: 'mixedBody' }] : [];

    return { body, headers: [], query: [], notices: [...mixed, ...notices] };
}
