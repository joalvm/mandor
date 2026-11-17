import type { HttpResponse } from '@mandor/schema';
import { detectedFormat } from '@mandor/ui';

/** What the body is, read off the `content-type` the server gave and, failing that, the bytes. */
export type BodyKind =
    'binary' | 'html' | 'image' | 'javascript' | 'json' | 'markdown' | 'text' | 'xml';

/** Types that say nothing about the body: the bytes decide. */
const SAYS_NOTHING = new Set(['', 'application/octet-stream']);

/** The type as given: kept with a body written to disk, read off the headers otherwise. */
function declaredTypeOf(response: HttpResponse): string {
    if (response.body?.kind === 'stored') {
        return response.body.contentType;
    }

    return response.headers.find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? '';
}

/** The media type of the response, lower-case and without its parameters. */
export function contentTypeOf(response: HttpResponse): string {
    return (declaredTypeOf(response).split(';')[0] ?? '').trim().toLowerCase();
}

/**
 * What a declared type says the body is, the first match winning: an image first, since
 * `image/svg+xml` is an image before it is XML, and a type of text last, since `text/html` and
 * `text/markdown` say more than that they are text.
 */
const KIND_OF_TYPE: readonly (readonly [(type: string) => boolean, BodyKind])[] = [
    [(type) => type.startsWith('image/'), 'image'],
    [(type) => type.includes('json'), 'json'],
    [(type) => type.includes('html'), 'html'],
    [(type) => type.includes('xml'), 'xml'],
    [(type) => type.includes('javascript') || type.includes('ecmascript'), 'javascript'],
    [(type) => type.includes('markdown'), 'markdown'],
    [(type) => type.startsWith('text/'), 'text'],
];

function kindOfType(type: string): BodyKind | null {
    return KIND_OF_TYPE.find(([says]) => says(type))?.[1] ?? null;
}

/**
 * What the body is. The type the server gave wins when it says something; when it does not, or
 * names a type nobody here knows, the start of the body is read. `sample` is that start as text,
 * or `null` when it is not text: bytes that never were text are binary.
 */
export function bodyKindOf(type: string, sample: string | null): BodyKind {
    const declared = SAYS_NOTHING.has(type) ? null : kindOfType(type);

    if (declared !== null) {
        return declared;
    }

    return sample === null ? 'binary' : detectedFormat(sample);
}

const EXTENSION_OF_KIND: Readonly<Record<Exclude<BodyKind, 'image'>, string>> = {
    binary: 'bin',
    html: 'html',
    javascript: 'js',
    json: 'json',
    markdown: 'md',
    text: 'txt',
    xml: 'xml',
};

/** The extension a file of the body carries; an image keeps the subtype its server named. */
function extensionOf(type: string, kind: BodyKind): string {
    const subtype = ((type.split('/')[1] ?? '').split('+')[0] ?? '').replace(/[^a-z0-9]/g, '');

    if (kind !== 'image') {
        return EXTENSION_OF_KIND[kind];
    }

    return subtype === '' ? 'bin' : subtype;
}

/** The name the save dialog offers: what the body is, with the extension a file of it carries. */
export function bodyFileName(type: string, kind: BodyKind): string {
    return `response.${extensionOf(type, kind)}`;
}

/**
 * What the body of a response is, from what the window already holds of it: a body kept as text
 * lends its start to the guess, and one in base64 or on disk is left to its type.
 */
export function responseKindOf(response: HttpResponse): BodyKind {
    const { body } = response;
    const sample = body?.kind === 'inline' && body.encoding === 'utf8' ? body.text : null;

    return bodyKindOf(contentTypeOf(response), sample);
}
