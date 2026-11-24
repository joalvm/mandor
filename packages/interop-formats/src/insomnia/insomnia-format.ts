import type { InteropFormat } from '@mandor/interop-core';

import { looksLikeInsomniaFiles } from './document/sniff-insomnia.js';

/**
 * Insomnia as the app lists it. It reads the collections of v4 (JSON or YAML) and v5 (YAML) and
 * writes v5, a file per collection with the environments of the workspace inside it, and the
 * WebSocket connections in the first. The codec
 * loads when an import or an export asks for it, never at startup, and never inside the renderer.
 */
export const insomniaFormat: InteropFormat = {
    id: 'insomnia',
    label: 'Insomnia',
    reads: ['json', 'yaml', 'yml'],
    writes: ['yaml'],
    scopes: ['collection', 'workspace'],
    input: 'files',
    unwritten: {
        doc: 'noWorkspaceNotes',
        message: 'noWebsocketMessages',
        socketio: 'socketioOwnKind',
    },
    unkept: {
        collection: {
            auth: 'authMovedDown',
            headers: 'headersMovedDown',
            scripts: 'scriptsNotCarried',
            disabledVariables: 'disabledVariablesDropped',
        },
        folder: { disabledVariables: 'disabledVariablesDropped' },
        connections: 'connectionsInFirstCollection',
        environments: 'disabledVariablesDropped',
        writesScripts: true,
        request: {
            tags: 'tagsDropped',
            examples: 'examplesDropped',
            schemas: 'schemasDropped',
            settingsKept: ['followRedirects', 'useCookieJar'],
        },
    },
    sniff: looksLikeInsomniaFiles,
    load: async () => (await import('./insomnia-codec.js')).insomniaCodec,
};
