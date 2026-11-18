import { joinedHeaders } from './joined-headers.js';
import type { SnippetBody, SnippetRequest } from './snippet-request.js';
import { urlencodedOf } from './urlencoded-of.js';

type BodyOf<T extends SnippetBody['type']> = Extract<SnippetBody, { type: T }>;
type Header = [string, string];
type FormField = BodyOf<'form'>['fields'][number];

/** What a body adds: lines before the call, arguments of the call, and the headers it keeps. */
type Written = { lines: string[]; args: string[]; headers: Header[] };

const URLENCODED = 'application/x-www-form-urlencoded';

/** The methods `-Method` takes by name; any other goes by `-CustomMethod`. */
const LISTED_METHODS = new Set([
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'DELETE',
    'TRACE',
    'OPTIONS',
    'MERGE',
    'PATCH',
]);

/** What PowerShell reads as a single quote: the plain one and four typographic ones. */
const SINGLE_QUOTES = /['‘’‚‛]/g;

/**
 * A literal that expands nothing. A double-quoted string would run a `$(…)` of the value: in
 * single quotes only a quote means anything, and a doubled one is itself.
 */
function quote(text: string): string {
    return `'${text.replace(SINGLE_QUOTES, '$&$&')}'`;
}

function isContentType([name]: Header): boolean {
    return name.toLowerCase() === 'content-type';
}

/** The type the request named for its body, or the one the body has. */
function contentTypeOf(headers: Header[], fallback: string): string {
    return headers.find(isContentType)?.[1] ?? fallback;
}

function withoutContentType(headers: Header[]): Header[] {
    return headers.filter((header) => !isContentType(header));
}

/** A text goes as typed; a file is read from the path the field names. */
const FIELD_VALUE: Readonly<Record<FormField['kind'], (value: string) => string>> = {
    text: quote,
    file: (value) => `Get-Item -LiteralPath ${quote(value)}`,
};

/** Inside an array a command needs its parentheses, or its arguments run into the next value. */
const ITEM_VALUE: Readonly<Record<FormField['kind'], (value: string) => string>> = {
    text: quote,
    file: (value) => `(${FIELD_VALUE.file(value)})`,
};

/** A name given once sends its value; given twice, every value, as an array. */
function entryValue(fields: FormField[]): string {
    const [only] = fields;

    if (fields.length === 1 && only !== undefined) {
        return FIELD_VALUE[only.kind](only.value);
    }

    return `@(${fields.map((field) => ITEM_VALUE[field.kind](field.value)).join(', ')})`;
}

function formLines(fields: FormField[]): string[] {
    const named = new Map<string, FormField[]>();

    for (const field of fields) {
        named.set(field.name, [...(named.get(field.name) ?? []), field]);
    }

    const entries = [...named].map(([name, each]) => `    ${quote(name)} = ${entryValue(each)}`);

    return ['$form = @{', ...entries, '}'];
}

/** `-Form` writes the multipart header itself, with its own boundary. */
const WRITTEN_OF_BODY: {
    [T in SnippetBody['type']]: (body: BodyOf<T>, headers: Header[]) => Written;
} = {
    none: (_body, headers) => ({ lines: [], args: [], headers }),
    text: (body, headers) => ({
        lines: [],
        args: [
            `-ContentType ${quote(contentTypeOf(headers, body.contentType))}`,
            `-Body ${quote(body.text)}`,
        ],
        headers: withoutContentType(headers),
    }),
    urlencoded: (body, headers) => ({
        lines: [],
        args: [
            `-ContentType ${quote(contentTypeOf(headers, URLENCODED))}`,
            `-Body ${quote(urlencodedOf(body.fields))}`,
        ],
        headers: withoutContentType(headers),
    }),
    form: (body, headers) => ({
        lines: formLines(body.fields),
        args: ['-Form $form'],
        headers: withoutContentType(headers),
    }),
};

function writtenOf<T extends SnippetBody['type']>(
    type: T,
    body: BodyOf<T>,
    headers: Header[],
): Written {
    return WRITTEN_OF_BODY[type](body, headers);
}

function methodArgOf(method: string): string {
    const flag = LISTED_METHODS.has(method.toUpperCase()) ? '-Method' : '-CustomMethod';

    return `${flag} ${quote(method)}`;
}

/**
 * The request as `Invoke-WebRequest`, written here rather than by the snippet library: the
 * library puts values in double quotes, where a `$(…)` in a header of a collection someone else
 * wrote runs when the copied code does.
 */
export function powershellCommandOf(request: SnippetRequest): string {
    const written = writtenOf(request.body.type, request.body, request.headers);
    const headers = joinedHeaders(written.headers);
    const headerLines = headers.map(
        ([name, value]) => `$headers.Add(${quote(name)}, ${quote(value)})`,
    );
    const call = [
        '$response = Invoke-WebRequest',
        `-Uri ${quote(request.url)}`,
        methodArgOf(request.method),
        ...(headers.length === 0 ? [] : ['-Headers $headers']),
        ...written.args,
    ];
    const opening = headers.length === 0 ? [] : ['$headers = @{}', ...headerLines];

    return [...opening, ...written.lines, call.join(' ')].join('\n');
}
