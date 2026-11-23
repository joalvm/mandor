import type { InteropFormat } from '@mandor/interop-core';

import { looksLikeBrunoFiles } from './document/sniff-bruno.js';

/**
 * Bruno as the app lists it. It reads a folder with one collection or several, in OpenCollection
 * (YAML) or in `.bru` files, and writes OpenCollection: `opencollection.yml`, a directory per
 * folder, a file per request or WebSocket connection and `environments/`. The codec loads when
 * an import or an export asks for it, never at startup, and never inside the renderer.
 */
export const brunoFormat: InteropFormat = {
    id: 'bruno',
    label: 'Bruno',
    reads: ['yml', 'bru', 'json'],
    writes: ['yml'],
    scopes: ['collection', 'workspace'],
    input: 'folder',
    unwritten: {
        doc: 'noWorkspaceNotes',
        socketio: 'noSocketio',
    },
    unkept: {
        collection: {},
        folder: {},
        connections: 'connectionsInFirstCollection',
        connectionQueryOff: 'connectionQueryOffDropped',
        messagesNeedConnection: 'messagesNeedConnection',
        writesScripts: true,
        request: {
            graphqlExamples: 'examplesDropped',
            schemas: 'schemasDropped',
            settingsKept: [
                'timeoutMs',
                'followRedirects',
                'maxRedirects',
                'followAuthorizationOnRedirect',
            ],
        },
        message: { byName: 'messagesInConnectionOfName', details: 'messageDetailsDropped' },
    },
    sniff: looksLikeBrunoFiles,
    load: async () => (await import('./bruno-codec.js')).brunoCodec,
};
