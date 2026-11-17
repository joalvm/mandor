import type { RequestBody, RequestItem } from '@mandor/schema';

/**
 * What editing the body changes in the request. A GraphQL operation goes in a POST: the kind
 * that is picked takes a `GET` along, because a `GET` carries no body to put it in.
 */
export function changesOfBody(request: RequestItem, body: RequestBody): Partial<RequestItem> {
    if (body.type === 'graphql' && request.body.type !== 'graphql' && request.method === 'GET') {
        return { body, method: 'POST' };
    }

    return { body };
}
