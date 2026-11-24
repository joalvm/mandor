import { sniffSoleFile, type InteropFormat, type UnkeptParts } from '@mandor/interop-core';

import { sniffOpenapi } from './document/sniff-openapi.js';

/** What OpenAPI does with the settings of any level: a document has no levels to keep them in. */
const LEVEL_SETTINGS: UnkeptParts = {
    variables: 'noVariables',
    auth: 'authInEachOperation',
    headers: 'headersInEachOperation',
};

/**
 * OpenAPI as the app lists it, Swagger 2.0 and OpenAPI 3.x alike. The parser weighs megabytes of
 * dependency tree: the codec loads when an import or an export asks for it, never at startup,
 * and never inside the renderer. Exporting writes OpenAPI 3.1 in YAML, the one version the
 * workspace speaks whole.
 */
export const openapiFormat: InteropFormat = {
    id: 'openapi',
    label: 'OpenAPI',
    reads: ['yaml', 'yml', 'json'],
    writes: ['yaml', 'yml'],
    scopes: ['collection'],
    input: 'file',
    unwritten: { message: 'messagesNotHttp' },
    unkept: {
        collection: LEVEL_SETTINGS,
        folder: {
            ...LEVEL_SETTINGS,
            folders: 'foldersFlattened',
        },
        writesScripts: false,
        request: { settingsKept: [] },
    },
    sniff: sniffSoleFile(sniffOpenapi),
    load: async () => (await import('./openapi-codec.js')).openapiCodec,
};
