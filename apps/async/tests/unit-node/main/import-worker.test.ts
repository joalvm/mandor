import { answerRead } from '@mandor/host/import-worker';
import { describe, expect, it } from 'vitest';

import { ASYNC_FORMATS } from '../../../src/main/formats.js';

/** The smallest document of the format the app reads first. */
const DOCUMENT = { asyncapi: '3.0.0', info: { title: 'Pasarela', version: '1' } };

describe('the worker every import of Mandor Realtime reads in', () => {
    it('reads a document with the formats the app lists', async () => {
        const reply = await answerRead(ASYNC_FORMATS, {
            formatId: 'asyncapi',
            files: [{ path: 'pasarela.json', text: JSON.stringify(DOCUMENT) }],
            scope: 'workspace',
        });

        expect(reply).toMatchObject({ kind: 'read', read: { name: 'Pasarela' } });
    });

    /** The worker finds the format by its id: two with one id would read with the wrong one. */
    it('names each format it lists by an id of its own', () => {
        const ids = ASYNC_FORMATS.map((format) => format.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('does nothing when main loads it, since it has no parent to answer', async () => {
        await expect(import('../../../src/main/import-worker.js')).resolves.toBeDefined();
    });
});
