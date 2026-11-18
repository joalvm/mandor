import type { InteropDocument } from '../../src/ir/interop-document.js';

/** A document of the model as the tests want it, whole and ready for one field to change. */
export function documentOf(overrides: Partial<InteropDocument> = {}): InteropDocument {
    return {
        name: 'Pasarela',
        sourceId: 'pasarela@1',
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

/** One server as the tests name it, ready for one field to change. */
export function serverOf(name: string, url: string): InteropDocument['servers'][number] {
    return { name, url, protocol: 'wss', security: [], variables: {}, extras: {} };
}
