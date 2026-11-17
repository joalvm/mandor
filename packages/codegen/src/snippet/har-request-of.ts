import type { HarRequest } from '@readme/httpsnippet';

import type { SnippetBody, SnippetRequest } from './snippet-request.js';

type Header = { name: string; value: string };
type Written = { headers: Header[]; postData: HarRequest['postData'] };
type BodyOf<T extends SnippetBody['type']> = Extract<SnippetBody, { type: T }>;
type Param = { name: string; value: string } | { name: string; fileName: string };

const URLENCODED = 'application/x-www-form-urlencoded';

function isContentType(header: Header): boolean {
    return header.name.toLowerCase() === 'content-type';
}

function withContentType(headers: Header[], contentType: string): Header[] {
    return headers.some(isContentType)
        ? headers
        : [...headers, { name: 'Content-Type', value: contentType }];
}

function textWritten(body: BodyOf<'text'>, headers: Header[]): Written {
    return {
        headers: withContentType(headers, body.contentType),
        postData: { mimeType: body.contentType, text: body.text },
    };
}

function urlencodedWritten(body: BodyOf<'urlencoded'>, headers: Header[]): Written {
    const params = body.fields.map(([name, value]) => ({ name, value }));

    return {
        headers: withContentType(headers, URLENCODED),
        postData: { mimeType: URLENCODED, params },
    };
}

/** A field of the form as HAR: a file by the path it names, a text by its value. */
function formParam({ name, value, kind }: BodyOf<'form'>['fields'][number]): Param {
    if (kind === 'file') {
        return { name, fileName: value };
    }

    return { name, value };
}

// The library writes the multipart header itself, with its own boundary.
function formWritten(body: BodyOf<'form'>, headers: Header[]): Written {
    return {
        headers: headers.filter((header) => !isContentType(header)),
        postData: { mimeType: 'multipart/form-data', params: body.fields.map(formParam) },
    };
}

/** What each body adds to the HAR: its post data and the headers that must go with it. */
const WRITTEN_OF_BODY: {
    [T in SnippetBody['type']]: (body: BodyOf<T>, headers: Header[]) => Written;
} = {
    none: (_body, headers) => ({ headers, postData: { mimeType: '' } }),
    text: textWritten,
    urlencoded: urlencodedWritten,
    form: formWritten,
};

function writtenOf<T extends SnippetBody['type']>(
    type: T,
    body: BodyOf<T>,
    headers: Header[],
): Written {
    return WRITTEN_OF_BODY[type](body, headers);
}

/** The request as HAR, which is what the snippet library reads. The URL already carries the query. */
export function harRequestOf(request: SnippetRequest): HarRequest {
    const headers = request.headers.map(([name, value]) => ({ name, value }));
    const written = writtenOf(request.body.type, request.body, headers);

    return {
        method: request.method,
        url: request.url,
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: written.headers,
        queryString: [],
        headersSize: -1,
        bodySize: -1,
        postData: written.postData,
    };
}
