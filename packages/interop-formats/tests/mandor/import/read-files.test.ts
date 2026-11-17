import { FormatInputError, ImportOtherAppError } from '@mandor/interop-core';
import { FormatVersionError } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { readFiles } from '../../../src/mandor/import/read-files.js';
import { fixtureText } from '../support/sample-workspace.js';

const sync = { path: 'tienda.mandor.yaml', text: fixtureText('sync-workspace.mandor.yaml') };
const async = { path: 'pasarela.mandor.yaml', text: fixtureText('async-workspace.mandor.yaml') };

describe('readFiles of a workspace bundle', () => {
    it('names the import after the workspace and lists a resource of every place it fills', async () => {
        const read = await readFiles([sync], 'sync');
        const places = new Set(read.resources.map(({ place }) => place));

        expect(read.name).toBe('Tienda de Mascotas');
        expect([...places].sort()).toEqual([
            'collection',
            'doc',
            'environment',
            'folder',
            'item',
            'workspace',
        ]);
    });

    it('brings the connections of Realtime, which Request has none of', async () => {
        const read = await readFiles([async], 'async');

        expect(read.resources.map(({ place }) => place)).toContain('connection');
    });

    it('claims every resource for the same source: the workspace the bundle came from', async () => {
        const read = await readFiles([sync], 'sync');
        const sources = new Set(
            read.resources.map(({ origin }) => `${origin.kind}:${origin.sourceId}`),
        );

        expect([...sources]).toEqual(['mandor:Tienda de Mascotas']);
    });

    it('refuses with a rejection, not a throw, a bundle of the other app', async () => {
        await expect(readFiles([async], 'sync')).rejects.toBeInstanceOf(ImportOtherAppError);
    });

    it('refuses a bundle of another version', async () => {
        const newer = {
            path: 'x.yaml',
            text: sync.text.replace('formatVersion: 1', 'formatVersion: 3'),
        };

        await expect(readFiles([newer], 'sync')).rejects.toBeInstanceOf(FormatVersionError);
    });

    it('takes one file and no other number of them', async () => {
        await expect(readFiles([sync, async], 'sync')).rejects.toBeInstanceOf(FormatInputError);
        await expect(readFiles([], 'sync')).rejects.toBeInstanceOf(FormatInputError);
    });
});
