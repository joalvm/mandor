import type { RequestBody, RequestBodyOf, RequestBodyType } from '@mandor/schema';

/** The editor each kind of text body speaks. */
export const LANGUAGE_OF_BODY: Readonly<
    Record<'json' | 'text' | 'xml', 'jsonc' | 'plaintext' | 'xml'>
> = {
    json: 'jsonc',
    text: 'plaintext',
    xml: 'xml',
};

/** A fresh body each time: the fields of a form are not shared between two requests. */
const EMPTY_BODIES: { readonly [T in RequestBodyType]: () => RequestBodyOf<T> } = {
    binary: () => ({ file: '', type: 'binary' }),
    form: () => ({ fields: [], type: 'form' }),
    graphql: () => ({ query: '', type: 'graphql', variables: '' }),
    json: () => ({ content: '', type: 'json' }),
    none: () => ({ type: 'none' }),
    text: () => ({ content: '', type: 'text' }),
    urlencoded: () => ({ fields: [], type: 'urlencoded' }),
    xml: () => ({ content: '', type: 'xml' }),
};

/** What a body of each kind looks like before anybody wrote it. */
function emptyBodyOf(type: RequestBodyType): RequestBody {
    return EMPTY_BODIES[type]();
}

/** The kinds whose body is one text: the same text reads as JSON, as plain text or as XML. */
type TextBody = RequestBodyOf<keyof typeof LANGUAGE_OF_BODY>;

function isTextBody(body: RequestBody): body is TextBody {
    return Object.hasOwn(LANGUAGE_OF_BODY, body.type);
}

/**
 * The body a request holds once its kind changes. A change among the text kinds keeps what was
 * written, because the text is the same; any other change starts the new kind empty, because the
 * fields of a form and the file of a binary are not a text to carry over.
 */
export function bodyAfterKindChange(body: RequestBody, type: RequestBodyType): RequestBody {
    const empty = emptyBodyOf(type);

    if (isTextBody(body) && isTextBody(empty)) {
        return { ...empty, content: body.content };
    }

    return empty;
}

/** The keys the words of the picker answer with, one per kind the request keeps. */
export const BODY_TYPE_KEYS = {
    binary: 'bodyBinary',
    form: 'bodyForm',
    graphql: 'bodyGraphql',
    json: 'bodyJson',
    none: 'bodyNone',
    text: 'bodyText',
    urlencoded: 'bodyUrlencoded',
    xml: 'bodyXml',
} as const;

/**
 * The picker reads by family, the way a request is written: text to write, fields to fill, and
 * the rest. Every kind the request keeps sits in exactly one.
 */
export const BODY_TYPE_GROUPS = [
    { key: 'bodyGroupRaw', types: ['json', 'xml', 'text'] },
    { key: 'bodyGroupForm', types: ['form', 'urlencoded'] },
    { key: 'bodyGroupOther', types: ['graphql', 'binary', 'none'] },
] as const satisfies readonly { key: string; types: readonly RequestBodyType[] }[];

/** The kinds whose text the editor knows how to lay out. */
export const BEAUTIFIES: Readonly<Record<RequestBodyType, boolean>> = {
    binary: false,
    form: false,
    graphql: false,
    json: true,
    none: false,
    text: false,
    urlencoded: false,
    xml: false,
};
