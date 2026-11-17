import { sniffSoleFile, type InteropFormat } from '@mandor/interop-core';

import { sniffHar } from './document/sniff-har.js';

/**
 * HAR 1.2 as the app lists it: the traffic a browser recorded, in JSON. Mandor only reads it, so
 * `writes` is empty. The codec loads when an import asks for it, never at startup, and never
 * inside the renderer.
 */
export const harFormat: InteropFormat = {
    id: 'har',
    label: 'HAR',
    reads: ['har', 'json'],
    writes: [],
    scopes: ['collection'],
    input: 'file',
    unwritten: {},
    unkept: { collection: {}, folder: {} },
    sniff: sniffSoleFile(sniffHar),
    load: async () => (await import('./har-codec.js')).harCodec,
};
