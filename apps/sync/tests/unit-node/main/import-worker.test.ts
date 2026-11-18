import { answerRead } from '@mandor/host/import-worker';
import { describe, expect, it } from 'vitest';

import { SYNC_FORMATS } from '../../../src/main/formats.js';

/** The smallest document of the format the app reads first: 3.1 refuses one with no operation. */
const DOCUMENT = {
    openapi: '3.1.0',
    info: { title: 'Pagos', version: '1' },
    paths: { '/pagos': { get: { responses: { '200': { description: 'ok' } } } } },
};

describe('the worker every import of Mandor Request reads in', () => {
    it('reads a document with the formats the app lists', async () => {
        const reply = await answerRead(SYNC_FORMATS, {
            formatId: 'openapi',
            files: [{ path: 'pagos.json', text: JSON.stringify(DOCUMENT) }],
            scope: 'workspace',
        });

        expect(reply).toMatchObject({ kind: 'read', read: { name: 'Pagos' } });
    });

    /** The worker finds the format by its id: two with one id would read with the wrong one. */
    it('names each format it lists by an id of its own', () => {
        const ids = SYNC_FORMATS.map((format) => format.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('does nothing when main loads it, since it has no parent to answer', async () => {
        await expect(import('../../../src/main/import-worker.js')).resolves.toBeDefined();
    });
});
