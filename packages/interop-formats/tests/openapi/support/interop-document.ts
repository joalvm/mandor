import type { InteropDocument } from '@mandor/interop-core';

/** A document of the model as the tests want it, whole and ready for one field to change. */
export function documentOf(overrides: Partial<InteropDocument> = {}): InteropDocument {
    return {
        name: 'Pasarela',
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
