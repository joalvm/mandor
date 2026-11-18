import type { SnippetBody, SnippetRequest } from './snippet-request.js';
import { urlencodedOf } from './urlencoded-of.js';

type BodyOf<T extends SnippetBody['type']> = Extract<SnippetBody, { type: T }>;
type Header = [string, string];
type FormField = BodyOf<'form'>['fields'][number];

/** What the request kept of its own about the wire, in the units curl counts. */
export type PhpCurlOptions = {
    timeoutSeconds?: number | undefined;
    maxRedirects?: number | undefined;
};

/** What a body adds: the lines of its post fields, and the headers it goes out with. */
type Written = { fields: string[]; headers: Header[] };

const URLENCODED = 'application/x-www-form-urlencoded';

const CLOSING = [
    '$response = curl_exec($curl);',
    '$err = curl_error($curl);',
    '',
    'curl_close($curl);',
    '',
    'if ($err) {',
    "  echo 'cURL Error #:' . $err;",
    '} else {',
    '  echo $response;',
    '}',
];

/**
 * A literal that expands nothing. A double-quoted string would run a `{${…}}` of the value: in
 * single quotes only the backslash and the quote mean anything, each behind a backslash.
 */
function quote(text: string): string {
    return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function isContentType([name]: Header): boolean {
    return name.toLowerCase() === 'content-type';
}

/** A body says what it is unless the request already did. */
function withContentType(headers: Header[], contentType: string): Header[] {
    return headers.some(isContentType) ? headers : [...headers, ['Content-Type', contentType]];
}

/** A text goes as typed; a file is read from the path the field names. */
const FIELD_VALUE: Readonly<Record<FormField['kind'], (value: string) => string>> = {
    text: quote,
    file: (value) => `new CURLFile(${quote(value)})`,
};

/** Curl writes the multipart header itself, with its own boundary, from an array of fields. */
const WRITTEN_OF_BODY: {
    [T in SnippetBody['type']]: (body: BodyOf<T>, headers: Header[]) => Written;
} = {
    none: (_body, headers) => ({ fields: [], headers }),
    text: (body, headers) => ({
        fields: [`  CURLOPT_POSTFIELDS => ${quote(body.text)},`],
        headers: withContentType(headers, body.contentType),
    }),
    urlencoded: (body, headers) => ({
        fields: [`  CURLOPT_POSTFIELDS => ${quote(urlencodedOf(body.fields))},`],
        headers: withContentType(headers, URLENCODED),
    }),
    form: (body, headers) => ({
        fields: [
            '  CURLOPT_POSTFIELDS => [',
            ...body.fields.map(
                (field) => `    ${quote(field.name)} => ${FIELD_VALUE[field.kind](field.value)},`,
            ),
            '  ],',
        ],
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

function optionLine(name: string, value: number | undefined): string[] {
    return value === undefined ? [] : [`  ${name} => ${String(value)},`];
}

function headerLines(headers: Header[]): string[] {
    if (headers.length === 0) {
        return [];
    }

    const lines = headers.map(([name, value]) => `    ${quote(`${name}: ${value}`)},`);

    return ['  CURLOPT_HTTPHEADER => [', ...lines, '  ],'];
}

/**
 * The request as PHP curl, written here rather than by the snippet library: the library puts
 * values in double quotes, where a `{${…}}` in a header of a collection someone else wrote runs
 * when the copied code does.
 */
export function phpCurlCommandOf(request: SnippetRequest, options: PhpCurlOptions): string {
    const written = writtenOf(request.body.type, request.body, request.headers);
    const settings = [
        `  CURLOPT_URL => ${quote(request.url)},`,
        '  CURLOPT_RETURNTRANSFER => true,',
        "  CURLOPT_ENCODING => '',",
        ...optionLine('CURLOPT_MAXREDIRS', options.maxRedirects),
        ...optionLine('CURLOPT_TIMEOUT', options.timeoutSeconds),
        '  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,',
        `  CURLOPT_CUSTOMREQUEST => ${quote(request.method)},`,
        ...written.fields,
        ...headerLines(written.headers),
    ];

    return [
        '<?php',
        '',
        '$curl = curl_init();',
        '',
        'curl_setopt_array($curl, [',
        ...settings,
        ']);',
        '',
        ...CLOSING,
    ].join('\n');
}
