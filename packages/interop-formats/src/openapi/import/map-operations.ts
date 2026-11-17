import type { InteropOperation } from '@mandor/interop-core';

import { asRecord, listAt, recordAt, textAt } from '../document/node-access.js';
import { unknownKeys } from '../document/unknown-keys.js';
import { HTTP_METHODS } from './http-methods.js';
import { parametersOf } from './map-parameters.js';
import { requestBodyOf } from './map-request-body.js';
import { responsesOf } from './map-responses.js';
import { operationSecurityOf } from './map-security.js';
import { operationName } from './operation-name.js';

const KNOWN = [
    'summary',
    'description',
    'tags',
    'parameters',
    'requestBody',
    'responses',
    'security',
];

/**
 * One operation per path and method, told from Mandor's side: everything is outgoing, because an
 * HTTP document describes what the client sends. What a request needs beyond a message — method,
 * path, parameters, body — travels in `http`.
 */
export function operationsOf(document: Record<string, unknown>): InteropOperation[] {
    const taken = new Set<string>();

    return Object.entries(recordAt(document, 'paths')).flatMap(([path, item]) => {
        const node = asRecord(item);

        return Object.entries(node)
            .filter(([key]) => HTTP_METHODS.includes(key))
            .map(([key, operation]) =>
                operationOf({ method: key.toUpperCase(), path }, node, asRecord(operation), {
                    document,
                    taken,
                }),
            );
    });
}

function operationOf(
    where: { method: string; path: string },
    item: Record<string, unknown>,
    operation: Record<string, unknown>,
    context: { document: Record<string, unknown>; taken: Set<string> },
): InteropOperation {
    return {
        name: operationName(operation, where, context.taken),
        channel: where.path,
        direction: 'outgoing',
        security: [],
        http: {
            ...where,
            summary: textAt(operation, 'summary'),
            description: textAt(operation, 'description'),
            tags: listAt(operation, 'tags').filter((tag): tag is string => typeof tag === 'string'),
            parameters: parametersOf(item, operation),
            requestBody: requestBodyOf(operation, context.document),
            responses: responsesOf(operation, context.document),
            security: operationSecurityOf(operation),
        },
        extras: unknownKeys(operation, KNOWN),
    };
}
