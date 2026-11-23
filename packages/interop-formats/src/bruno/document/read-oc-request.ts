import type { z } from 'zod';

import type { BrunoAuth, BrunoBody, BrunoRequest } from './bruno-tree.js';
import { leftOutOf } from './left-out-of.js';
import type { httpSchema, itemSchema } from './opencollection-schema.js';
import { sequenceOf } from './order-nodes.js';
import { authOfOpenCollection } from './read-oc-auth.js';
import { graphqlBodyOf, httpBodyOf } from './read-oc-body.js';
import { examplesOfOpenCollection } from './read-oc-example.js';
import { descriptionTextOf, paramsOf, rowsOf } from './read-oc-parts.js';
import { scriptPartsOf } from './read-bru-scripts.js';
import { settingsOf } from './read-settings.js';

export type OcItem = z.output<typeof itemSchema>;

type Details = Omit<z.output<typeof httpSchema>, 'body'>;

type Parts = {
    item: OcItem;
    name: string;
    details: Details;
    body: BrunoBody | undefined;
    method: string;
};

/** What the document says about a thing in prose: the docs it keeps, else its description. */
export function noteOf(item: OcItem): string {
    return descriptionTextOf(item.docs) || descriptionTextOf(item.info?.description);
}

function requestFrom({ item, name, details, body, method }: Parts): BrunoRequest {
    const auth: BrunoAuth | undefined = authOfOpenCollection(details.auth);
    const { examples, unread } = examplesOfOpenCollection(item.examples);
    const runtime = item.runtime;
    const scripts = scriptPartsOf(runtime?.scripts);

    return {
        kind: 'request',
        tags: item.info?.tags ?? [],
        name,
        seq: sequenceOf(item.info?.seq),
        method: (details.method ?? method).toUpperCase(),
        url: details.url ?? '',
        description: noteOf(item),
        headers: rowsOf(details.headers),
        params: paramsOf(details.params, 'query'),
        pathParams: paramsOf(details.params, 'path'),
        body,
        auth,
        settings: settingsOf(item.settings),
        examples,
        scripts: scripts.read,
        leftOut: leftOutOf({
            scripts: scripts.unread,
            assertions: runtime?.assertions,
            actions: runtime?.actions,
            'request variables': runtime?.variables,
            examples: unread,
        }),
    };
}

/** The request an item is, over HTTP or GraphQL; nothing when it is neither (a socket, a script…). */
export function requestOf(item: OcItem, name: string): BrunoRequest | undefined {
    const { http, graphql } = item;

    if (http !== null && http !== undefined) {
        return requestFrom({
            item,
            name,
            details: http,
            body: httpBodyOf(http.body),
            method: 'GET',
        });
    }

    if (graphql !== null && graphql !== undefined) {
        const body = graphqlBodyOf(graphql.body);

        return requestFrom({ item, name, details: graphql, body, method: 'POST' });
    }

    return undefined;
}
