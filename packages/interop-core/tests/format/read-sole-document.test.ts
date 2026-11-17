import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { readSoleDocument } from '../../src/format/read-sole-document.js';
import type { InteropDocument } from '../../src/ir/interop-document.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

const DOCUMENT: InteropDocument = {
    name: 'Pasarela',
    sourceId: 'pasarela',
    servers: [],
    security: {},
    channels: [],
    operations: [],
    defaultSecurity: [],
    payloadSchemas: {},
    notes: [],
    extras: {},
};

const RESOURCE: ImportResource = {
    place: 'collection',
    itemKind: null,
    route: 'pasarela',
    name: 'Pasarela',
    fields: { name: 'Pasarela' },
    origin: { kind: 'openapi', sourceId: 'pasarela' },
    degradations: [],
};

describe('reading the one file of an import', () => {
    it('parses its text and carries the name the document gave itself with the resources', async () => {
        const seen: string[] = [];
        const read = await readSoleDocument([{ path: 'a.json', text: '{"a":1}' }], {
            parse: (text) => {
                seen.push(text);

                return DOCUMENT;
            },
            resourcesOf: () => [RESOURCE],
        });

        expect(seen).toEqual(['{"a":1}']);
        expect(read).toEqual({ name: 'Pasarela', resources: [RESOURCE] });
    });

    it('waits for a parser that answers later and refuses a count of files it does not take', async () => {
        const steps = { parse: () => Promise.resolve(DOCUMENT), resourcesOf: () => [] };

        await expect(readSoleDocument([{ path: 'a', text: 'x' }], steps)).resolves.toEqual({
            name: 'Pasarela',
            resources: [],
        });
        await expect(readSoleDocument([], steps)).rejects.toThrow('not 0');
    });

    it('says what the document noted on the row that stands for it', async () => {
        const read = await readSoleDocument([{ path: 'a.json', text: '{}' }], {
            parse: () => ({ ...DOCUMENT, notes: [degradation('pkceAlways')] }),
            resourcesOf: () => [RESOURCE],
        });

        expect(read.resources[0]?.degradations).toEqual([degradation('pkceAlways')]);
    });
});
