import { joinedHeaders } from './joined-headers.js';
import type { SnippetBody, SnippetRequest } from './snippet-request.js';

type BodyOf<T extends SnippetBody['type']> = Extract<SnippetBody, { type: T }>;
type Header = [string, string];
type FormField = BodyOf<'form'>['fields'][number];

export type JavascriptClient = 'fetch' | 'axios';

/** What a body adds: imports, lines before the options, its value, and the headers it keeps. */
type Written = { imports: string[]; lines: string[]; body: string[]; headers: Header[] };

/** How a client is told the request: what it imports, where the URL and the body go, the call. */
type Client = {
    imports: string[];
    bodyKey: string;
    url: (url: string) => string[];
    call: (url: string) => string[];
};

const READ_FILE = 'import { openAsBlob } from "node:fs";';

/**
 * A string as JSON writes it, which is a JavaScript literal: every quote, backslash and control
 * character escaped, so a value of a collection someone else wrote never closes it.
 */
function quote(text: string): string {
    return JSON.stringify(text);
}

function isContentType([name]: Header): boolean {
    return name.toLowerCase() === 'content-type';
}

/** A body says what it is unless the request already did. */
function withContentType(headers: Header[], contentType: string): Header[] {
    return headers.some(isContentType) ? headers : [...headers, ['Content-Type', contentType]];
}

/** The name a file goes by in the form: the last segment of its path, on any system. */
function fileNameOf(path: string): string {
    return path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1);
}

const APPEND_OF_FIELD: Readonly<Record<FormField['kind'], (field: FormField) => string>> = {
    text: ({ name, value }) => `form.append(${quote(name)}, ${quote(value)});`,
    file: ({ name, value }) =>
        `form.append(${quote(name)}, await openAsBlob(${quote(value)}), ${quote(fileNameOf(value))});`,
};

/** The client writes the multipart header of a form itself, with its own boundary. */
const WRITTEN_OF_BODY: {
    [T in SnippetBody['type']]: (body: BodyOf<T>, headers: Header[]) => Written;
} = {
    none: (_body, headers) => ({ imports: [], lines: [], body: [], headers }),
    text: (body, headers) => ({
        imports: [],
        lines: [],
        body: [quote(body.text)],
        headers: withContentType(headers, body.contentType),
    }),
    urlencoded: (body, headers) => ({
        imports: [],
        lines: [],
        body: [`new URLSearchParams(${JSON.stringify(body.fields)})`],
        headers,
    }),
    form: (body, headers) => ({
        imports: body.fields.some((field) => field.kind === 'file') ? [READ_FILE] : [],
        lines: [
            'const form = new FormData();',
            ...body.fields.map((field) => APPEND_OF_FIELD[field.kind](field)),
            '',
        ],
        body: ['form'],
        headers: headers.filter((header) => !isContentType(header)),
    }),
};

function writtenOf<T extends SnippetBody['type']>(
    type: T,
    body: BodyOf<T>,
    headers: Header[],
): Written {
    return WRITTEN_OF_BODY[type](body, headers);
}

const CLIENTS: Readonly<Record<JavascriptClient, Client>> = {
    fetch: {
        imports: [],
        bodyKey: 'body',
        url: () => [],
        call: (url) => [
            `const response = await fetch(${quote(url)}, options);`,
            '',
            'console.log(await response.text());',
        ],
    },
    axios: {
        imports: ['import axios from "axios";'],
        bodyKey: 'data',
        url: (url) => [`url: ${quote(url)}`],
        call: () => [
            'const response = await axios.request(options);',
            '',
            'console.log(response.data);',
        ],
    },
};

function headersProperty(headers: Header[]): string[] {
    if (headers.length === 0) {
        return [];
    }

    const entries = headers.map(([name, value]) => `    ${quote(name)}: ${quote(value)}`);

    return [`headers: {\n${entries.join(',\n')}\n  }`];
}

/**
 * The request as JavaScript, written here rather than by the snippet library: the library
 * leaves a backslash of the value as it came, and one before a quote closes the literal and runs
 * what follows. Its form also sent a file's path as text instead of the file.
 */
export function javascriptCommandOf(request: SnippetRequest, client: JavascriptClient): string {
    const { imports, bodyKey, url, call } = CLIENTS[client];
    const written = writtenOf(request.body.type, request.body, request.headers);
    const properties = [
        `method: ${quote(request.method)}`,
        ...url(request.url),
        ...headersProperty(joinedHeaders(written.headers)),
        ...written.body.map((value) => `${bodyKey}: ${value}`),
    ];
    const allImports = [...imports, ...written.imports];
    const head = allImports.length === 0 ? [] : [...allImports, ''];

    return [
        ...head,
        ...written.lines,
        'const options = {',
        properties.map((property) => `  ${property}`).join(',\n'),
        '};',
        '',
        ...call(request.url),
    ].join('\n');
}
