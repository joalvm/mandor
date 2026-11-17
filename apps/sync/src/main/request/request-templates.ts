import type { RequestBody, RequestBodyOf, RequestItem, RequestLine } from '@mandor/schema';
import { wireJson } from '@mandor/validate';

/** What a send resolves of the body: texts and names already final, files still to be read. */
export type ResolvedBody =
    | { type: 'none' }
    | { type: 'json' | 'text' | 'xml'; content: string }
    | { type: 'urlencoded'; fields: [string, string][] }
    | { type: 'form'; fields: { key: string; value: string; kind: 'text' | 'file' }[] }
    | { type: 'binary'; file: string }
    | { type: 'graphql'; query: string; variables: string; operationName?: string | undefined };

/** The resolved body of one type; an intersection for the same reason as `RequestBodyOf`. */
export type ResolvedBodyOf<T extends ResolvedBody['type']> = ResolvedBody & { type: T };

type Row<T extends RequestLine> = { line: T; index: number };

/** The rows that go on the wire: switched on and named. The index is the one the user sees. */
function sendable<T extends RequestLine>(lines: readonly T[]): Row<T>[] {
    return lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.enabled && line.key !== '');
}

function linesTemplates(prefix: string, lines: readonly RequestLine[]): Record<string, string> {
    return Object.fromEntries(
        sendable(lines).flatMap(({ line, index }) => [
            [`${prefix}:${String(index)}:key`, line.key],
            [`${prefix}:${String(index)}:value`, line.value],
        ]),
    );
}

type Templates = Record<string, string>;

function noTemplates(): Templates {
    return {};
}

function fieldTemplates(body: RequestBodyOf<'form' | 'urlencoded'>): Templates {
    return linesTemplates('field', body.fields);
}

function contentTemplates(body: RequestBodyOf<'json' | 'text' | 'xml'>): Templates {
    return { body: body.content };
}

/** The texts each type of body writes `{{var}}` in. A file names no text. */
const TEMPLATES_OF_TYPE: {
    [T in RequestBody['type']]: (body: RequestBodyOf<T>) => Templates;
} = {
    binary: noTemplates,
    form: fieldTemplates,
    // The query is GraphQL as written: its `$name` are not ours and a `{{` in it is a string.
    graphql: (body) => ({ 'graphql:variables': body.variables }),
    // The editor writes JSONC: what reaches the server is the JSON it means.
    json: (body) => ({ body: wireJson(body.content) }),
    none: noTemplates,
    text: contentTemplates,
    urlencoded: fieldTemplates,
    xml: contentTemplates,
};

function templatesIn<T extends RequestBody['type']>(type: T, body: RequestBodyOf<T>): Templates {
    return TEMPLATES_OF_TYPE[type](body);
}

function bodyTemplates(body: RequestBody): Templates {
    return templatesIn(body.type, body);
}

/**
 * Every text of the request that takes `{{var}}`, keyed by where it came from, so the whole
 * request resolves in one pass and a missing name is found once, whichever field it was in.
 */
export function requestTemplates(request: RequestItem): Record<string, string> {
    return {
        url: request.url,
        ...linesTemplates('query', request.query),
        ...linesTemplates('header', request.headers),
        ...linesTemplates('path', request.pathParams),
        ...bodyTemplates(request.body),
    };
}

/** The pairs of one list of rows, resolved. */
export function resolvedPairs(
    prefix: string,
    lines: readonly RequestLine[],
    values: Record<string, string>,
): [string, string][] {
    return sendable(lines).map(({ index }) => [
        values[`${prefix}:${String(index)}:key`] ?? '',
        values[`${prefix}:${String(index)}:value`] ?? '',
    ]);
}

function resolvedContent(
    body: RequestBodyOf<'json' | 'text' | 'xml'>,
    values: Templates,
): ResolvedBody {
    return { type: body.type, content: values['body'] ?? '' };
}

function asWritten(body: RequestBodyOf<'binary' | 'none'>): ResolvedBody {
    return body;
}

/** Each type of body with the texts it wrote `{{var}}` in resolved. */
const RESOLVED_OF_TYPE: {
    [T in RequestBody['type']]: (body: RequestBodyOf<T>, values: Templates) => ResolvedBody;
} = {
    binary: asWritten,
    form: (body, values) => ({
        type: 'form',
        fields: sendable(body.fields).map(({ line, index }) => ({
            key: values[`field:${String(index)}:key`] ?? '',
            value: values[`field:${String(index)}:value`] ?? '',
            kind: line.kind,
        })),
    }),
    graphql: (body, values) => ({ ...body, variables: values['graphql:variables'] ?? '' }),
    json: resolvedContent,
    none: asWritten,
    text: resolvedContent,
    urlencoded: (body, values) => ({
        type: 'urlencoded',
        fields: resolvedPairs('field', body.fields, values),
    }),
    xml: resolvedContent,
};

function resolvedIn<T extends RequestBody['type']>(
    type: T,
    body: RequestBodyOf<T>,
    values: Templates,
): ResolvedBody {
    return RESOLVED_OF_TYPE[type](body, values);
}

/** The body of the request with its texts resolved. */
export function resolvedBody(body: RequestBody, values: Record<string, string>): ResolvedBody {
    return resolvedIn(body.type, body, values);
}
