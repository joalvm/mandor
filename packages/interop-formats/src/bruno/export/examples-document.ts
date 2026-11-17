import type { FormatDocument } from '@mandor/interop-core';
import {
    exampleRequest,
    type RequestExample,
    type RequestItem,
    type ResponseCookie,
} from '@mandor/schema';

import { bodyDocumentOf } from './body-document.js';
import { requestPartOf } from './request-part.js';

/** The kinds of body an example has a word for, by what its type says; a text otherwise. */
const BODY_TYPES: readonly (readonly [string, string])[] = [
    ['json', 'json'],
    ['xml', 'xml'],
    ['html', 'html'],
];

function bodyTypeOf(contentType: string): string {
    return BODY_TYPES.find(([word]) => contentType.includes(word))?.[1] ?? 'text';
}

/** A cookie as the header that sets it: OpenCollection keeps no cookies of a response. */
function setCookieOf(cookie: ResponseCookie): string {
    const attributes = [
        `${cookie.name}=${cookie.value}`,
        ...(cookie.domain === undefined ? [] : [`Domain=${cookie.domain}`]),
        ...(cookie.path === undefined ? [] : [`Path=${cookie.path}`]),
        ...(cookie.expires === undefined ? [] : [`Expires=${cookie.expires}`]),
        ...(cookie.httpOnly ? ['HttpOnly'] : []),
        ...(cookie.secure ? ['Secure'] : []),
        ...(cookie.sameSite === undefined ? [] : [`SameSite=${cookie.sameSite}`]),
    ];

    return attributes.join('; ');
}

function answerHeadersOf({ contentType, headers = [], cookies = [] }: RequestExample) {
    const says = headers.some(([key]) => key.toLowerCase() === 'content-type');

    return [
        ...(contentType === '' || says ? [] : [{ name: 'Content-Type', value: contentType }]),
        ...headers.map(([name, value]) => ({ name, value })),
        ...cookies.map((cookie) => ({ name: 'Set-Cookie', value: setCookieOf(cookie) })),
    ];
}

/** The request an example was saved with, when it says one; an HTTP example has no query body. */
function requestDocumentOf(request: RequestItem, example: RequestExample): FormatDocument {
    if (example.request === undefined) {
        return {};
    }

    const sent = exampleRequest(request, example);
    const { kind, body } = bodyDocumentOf(sent.body);
    const sendable = [body].filter((each) => each !== undefined && kind === 'http');

    return {
        request: {
            ...requestPartOf(sent),
            ...(sendable.length === 0 ? {} : { body: sendable[0] }),
        },
        ...(example.request.description === undefined
            ? {}
            : { description: example.request.description }),
    };
}

/**
 * The examples of a request as OpenCollection keeps them. The schema an example answers to has no
 * place there, nor does a status that is not a number, which leaves the status unsaid.
 */
export function examplesDocumentOf(request: RequestItem): FormatDocument {
    if (request.examples.length === 0) {
        return {};
    }

    return {
        examples: request.examples.map((example) => {
            const code = Number.parseInt(example.status, 10);

            return {
                name: example.name,
                ...requestDocumentOf(request, example),
                response: {
                    ...(Number.isNaN(code) ? {} : { status: code }),
                    headers: answerHeadersOf(example),
                    body: { type: bodyTypeOf(example.contentType), data: example.body },
                },
            };
        }),
    };
}
