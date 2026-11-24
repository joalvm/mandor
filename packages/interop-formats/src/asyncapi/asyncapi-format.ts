import { sniffSoleFile, type InteropFormat } from '@mandor/interop-core';

import { sniffAsyncapi } from './document/sniff-asyncapi.js';

/**
 * AsyncAPI as the app lists it. The parser weighs over ten megabytes of dependency tree: the
 * codec loads when an import or an export asks for it, never at startup, and never inside the
 * renderer.
 */
export const asyncapiFormat: InteropFormat = {
    id: 'asyncapi',
    label: 'AsyncAPI',
    reads: ['yaml', 'yml', 'json'],
    writes: ['yaml', 'yml'],
    scopes: ['collection'],
    input: 'file',
    unwritten: {},
    unkept: {
        writesScripts: false,
        collection: { variables: 'noVariables' },
        folder: {
            variables: 'noVariables',
            folders: 'foldersFlattened',
        },
    },
    sniff: sniffSoleFile(sniffAsyncapi),
    load: async () => (await import('./asyncapi-codec.js')).asyncapiCodec,
};
