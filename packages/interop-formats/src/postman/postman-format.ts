import type { InteropFormat } from '@mandor/interop-core';

import { looksLikePostmanFiles } from './document/sniff-postman.js';

/**
 * Postman as the app lists it: collections v2.1, environments and globals, all of them JSON.
 * It reads the files of a workspace together — a collection with its environments is one
 * import — and writes a file per collection and a file per environment, which is what Postman
 * imports and Newman runs. The codec loads when an import or an export asks for it, never at
 * startup, and never inside the renderer.
 */
export const postmanFormat: InteropFormat = {
    id: 'postman',
    label: 'Postman',
    reads: ['json'],
    writes: ['json'],
    scopes: ['collection', 'workspace'],
    input: 'files',
    unwritten: {
        connection: 'noConnections',
        doc: 'noWorkspaceNotes',
        message: 'messagesNotHttp',
    },
    unkept: {
        collection: { headers: 'headersCopied' },
        folder: {
            variables: 'folderVariablesUnresolved',
            headers: 'headersCopied',
        },
        writesScripts: true,
        request: {
            tags: 'tagsDropped',
            schemas: 'schemasDropped',
            settingsKept: [
                'followRedirects',
                'maxRedirects',
                'validateTls',
                'keepMethodOnRedirect',
                'useCookieJar',
                'httpVersion',
                'followAuthorizationOnRedirect',
                'tlsCiphers',
                'tlsMinVersion',
                'tlsMaxVersion',
            ],
        },
    },
    sniff: looksLikePostmanFiles,
    load: async () => (await import('./postman-codec.js')).postmanCodec,
};
