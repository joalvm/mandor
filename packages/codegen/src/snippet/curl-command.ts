import { QUOTE_OF_SHELL, type CurlShell } from './curl-quote.js';
import type { SnippetBody, SnippetRequest, SnippetSettings } from './snippet-request.js';

type BodyOf<T extends SnippetBody['type']> = Extract<SnippetBody, { type: T }>;
type Header = [string, string];
type Quote = (text: string) => string;
type FormField = BodyOf<'form'>['fields'][number];

/** What ends a line the command goes on after. */
const CONTINUATION: Readonly<Record<CurlShell, string>> = { bash: ' \\', cmd: ' ^' };

/** A text is sent as is; a file is read by curl from the path the field names. */
const FORM_LINE: Readonly<Record<FormField['kind'], (field: FormField, quote: Quote) => string>> = {
    text: ({ name, value }, quote) => `--form-string ${quote(`${name}=${value}`)}`,
    file: ({ name, value }, quote) => `-F ${quote(`${name}=@${value}`)}`,
};

function isContentType([name]: Header): boolean {
    return name.toLowerCase() === 'content-type';
}

/** Curl calls any data a form; a text says what it is unless the request already did. */
function textHeaders(body: BodyOf<'text'>, headers: Header[]): Header[] {
    return headers.some(isContentType) ? headers : [...headers, ['Content-Type', body.contentType]];
}

/** The headers each body goes out with. A multipart one is written by curl, with its boundary. */
const HEADERS_OF_BODY: {
    [T in SnippetBody['type']]: (body: BodyOf<T>, headers: Header[]) => Header[];
} = {
    none: (_body, headers) => headers,
    text: textHeaders,
    urlencoded: (_body, headers) => headers,
    form: (_body, headers) => headers.filter((header) => !isContentType(header)),
};

/** The lines that carry the body, each field on a line of its own. */
const BODY_LINES: { [T in SnippetBody['type']]: (body: BodyOf<T>, quote: Quote) => string[] } = {
    none: () => [],
    text: (body, quote) => [`--data-raw ${quote(body.text)}`],
    urlencoded: (body, quote) =>
        body.fields.map(([name, value]) => `--data-urlencode ${quote(`${name}=${value}`)}`),
    form: (body, quote) => body.fields.map((field) => FORM_LINE[field.kind](field, quote)),
};

function headersOf<T extends SnippetBody['type']>(type: T, body: BodyOf<T>, headers: Header[]) {
    return HEADERS_OF_BODY[type](body, headers);
}

function bodyLinesOf<T extends SnippetBody['type']>(type: T, body: BodyOf<T>, quote: Quote) {
    return BODY_LINES[type](body, quote);
}

/** An empty value is sent with `;`: with `:` curl would leave the header out. */
function headerLine([name, value]: Header, quote: Quote): string {
    return `-H ${quote(value === '' ? `${name};` : `${name}: ${value}`)}`;
}

/** Curl sends GET with nothing to send and POST with something; any other method is said. */
const IMPLIED_METHOD: Readonly<Record<SnippetBody['type'], string>> = {
    none: 'GET',
    text: 'POST',
    urlencoded: 'POST',
    form: 'POST',
};

function methodLines({ body, method }: SnippetRequest, quote: Quote): string[] {
    return method.toUpperCase() === IMPLIED_METHOD[body.type] ? [] : [`-X ${quote(method)}`];
}

/** Curl stops at the first redirect, and turns a POST into a GET on a 301 or a 302, unless told. */
function redirectLines({ keepMethodOnRedirect, maxRedirects }: SnippetSettings): string[] {
    return [
        '-L',
        ...(maxRedirects === undefined ? [] : [`--max-redirs ${String(maxRedirects)}`]),
        ...(keepMethodOnRedirect === true ? ['--post301', '--post302'] : []),
    ];
}

/**
 * What the request set that curl does only when told: follow, give up in time, trust any
 * certificate. A setting the request left to the app stays unsaid, as it stays out of its file.
 */
function settingLines(settings: SnippetSettings): string[] {
    const timeoutMs = settings.timeoutMs ?? 0;

    return [
        ...(settings.followRedirects === true ? redirectLines(settings) : []),
        ...(timeoutMs > 0 ? [`--max-time ${String(timeoutMs / 1000)}`] : []),
        ...(settings.validateTls === false ? ['--insecure'] : []),
    ];
}

/**
 * The request as a curl command for one shell, written the way DevTools copies it: the URL
 * first, one option per line, each line but the last continued in the manner of the shell.
 */
export function curlCommandOf(
    request: SnippetRequest,
    shell: CurlShell,
    settings: SnippetSettings,
): string {
    const quote = QUOTE_OF_SHELL[shell];
    const headers = headersOf(request.body.type, request.body, request.headers);
    const lines = [
        `curl --url ${quote(request.url)}`,
        ...methodLines(request, quote),
        ...headers.map((header) => headerLine(header, quote)),
        ...bodyLinesOf(request.body.type, request.body, quote),
        ...settingLines(settings),
    ];

    return lines.join(`${CONTINUATION[shell]}\n  `);
}
