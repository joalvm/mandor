import type { InteropResponseExample } from '@mandor/interop-core';
import type { ResponseCookie } from '@mandor/schema';

import type { PostmanResponse } from '../document/postman-collection-schema.js';
import { exampleRequestOf } from './example-request-of.js';

const PREVIEW_TYPES = new Map([
    ['json', 'application/json'],
    ['xml', 'application/xml'],
    ['html', 'text/html'],
    ['text', 'text/plain'],
]);

/**
 * The saved examples of a request, with the status and the content type they were saved with, what
 * else they answered, and the request that got that answer.
 */
export function responsesOf(
    responses: readonly PostmanResponse[] | null | undefined,
): InteropResponseExample[] {
    return (responses ?? []).map((response) => {
        const status =
            response.code === undefined || response.code === null ? '' : String(response.code);

        return {
            name: nameOf(response.name, status),
            status,
            contentType: contentTypeOf(response),
            body: response.body ?? '',
            ...detailsOf(response),
        };
    });
}

type ExampleDetails = Pick<InteropResponseExample, 'headers' | 'cookies' | 'sentWith'>;

function detailsOf(response: PostmanResponse): ExampleDetails {
    const headers = headersOf(response);
    const cookies = cookiesOf(response);
    const original = response.originalRequest;

    return {
        ...(headers.length === 0 ? {} : { headers }),
        ...(cookies.length === 0 ? {} : { cookies }),
        ...(original === undefined || original === null
            ? {}
            : { sentWith: exampleRequestOf(original) }),
    };
}

/** The headers it answered with, when they say more than the type, which has its own field. */
function headersOf(response: PostmanResponse): [string, string][] {
    const pairs = (response.header ?? []).flatMap((row): [string, string][] => {
        const key = row.key ?? '';

        return key.trim() === '' ? [] : [[key, row.value ?? '']];
    });

    return pairs.some(([key]) => key.toLowerCase() !== 'content-type') ? pairs : [];
}

function cookiesOf(response: PostmanResponse): ResponseCookie[] {
    return (response.cookie ?? []).flatMap((cookie) => {
        const name = cookie.name ?? '';

        return name === ''
            ? []
            : [
                  {
                      name,
                      value: cookie.value ?? '',
                      domain: filled(cookie.domain),
                      path: filled(cookie.path),
                      expires: filled(cookie.expires),
                      httpOnly: cookie.httpOnly === true,
                      secure: cookie.secure === true,
                  },
              ];
    });
}

/** A text the file leaves blank says nothing: Postman asks for a domain and a path in any case. */
function filled(text: string | null | undefined): string | undefined {
    return text === null || text === '' ? undefined : text;
}

function nameOf(name: string | null | undefined, status: string): string {
    if (name !== undefined && name !== null && name.trim() !== '') {
        return name;
    }

    return status === '' ? 'response' : status;
}

function contentTypeOf(response: PostmanResponse): string {
    const header = response.header?.find((row) => row.key?.toLowerCase() === 'content-type');
    const preview = PREVIEW_TYPES.get(response._postman_previewlanguage ?? '');

    return header?.value ?? preview ?? '';
}
