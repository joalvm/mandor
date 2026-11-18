import { sniffSoleFile, type InteropFormat } from '@mandor/interop-core';
import type { WorkspaceKind } from '@mandor/schema';

import { sniffMandor } from './document/sniff-mandor.js';

/**
 * The native format of the exchange: a whole workspace in one `.mandor.yaml`. It is bound to the
 * app that lists it, since a bundle of the other app holds items this one has no tab for.
 */
export function mandorFormatFor(app: WorkspaceKind): InteropFormat {
    return {
        id: 'mandor',
        label: 'Mandor',
        reads: ['yaml', 'yml'],
        writes: ['yaml'],
        scopes: ['workspace'],
        input: 'file',
        unwritten: {},
        unkept: { collection: {}, folder: {} },
        sniff: sniffSoleFile(sniffMandor),
        load: async () => (await import('./mandor-codec.js')).mandorCodecFor(app),
    };
}
