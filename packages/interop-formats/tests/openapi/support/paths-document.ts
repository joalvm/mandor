import type { InteropDocument, InteropHttpOperation, InteropOperation } from '@mandor/interop-core';

/** One http part of an operation as the tests want it, ready for one field to change. */
export function httpOf(overrides: Partial<InteropHttpOperation> = {}): InteropHttpOperation {
    return {
        method: 'GET',
        path: '/pets',
        tags: [],
        parameters: [],
        responses: [],
        security: null,
        ...overrides,
    };
}

/** One operation of the model as the tests want it, ready for one field to change. */
export function operationOf(overrides: Partial<InteropOperation> = {}): InteropOperation {
    return {
        name: 'listaMascotas',
        channel: '/pets',
        direction: 'outgoing',
        security: [],
        http: httpOf(),
        extras: {},
        ...overrides,
    };
}

/** A document of the model as the tests want it, ready for one field to change. */
export function documentOf(overrides: Partial<InteropDocument> = {}): InteropDocument {
    return {
        name: 'Tienda',
        sourceId: '',
        servers: [],
        security: {},
        channels: [],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
        ...overrides,
    };
}
