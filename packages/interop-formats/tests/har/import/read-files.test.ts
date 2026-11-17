import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { readFiles } from '../../../src/har/import/read-files.js';
import { fixtureText } from '../support/fixture.js';

describe('reading a HAR import', () => {
    it('reads its one recording into the name it gave itself and the resources of a workspace', async () => {
        const read = await readFiles([{ path: 'chrome.har', text: fixtureText('chrome.har') }]);
        const folders = read.resources.filter((resource) => resource.place === 'folder');

        expect(read.name).toBe('Example app');
        expect(read.resources[0]?.place).toBe('collection');
        expect(folders.map((folder) => folder.name)).toEqual([
            'api.example.test',
            'cdn.example.test',
        ]);
        expect(read.resources.some((resource) => resource.place === 'item')).toBe(true);
    });

    it('refuses what is not a HAR, saying why', async () => {
        await expect(readFiles([{ path: 'a.har', text: '[]' }])).rejects.toThrow(/root/);
    });

    it('refuses to read two files as one recording', async () => {
        const file = { path: 'chrome.har', text: fixtureText('chrome.har') };

        await expect(readFiles([file, file])).rejects.toBeInstanceOf(FormatInputError);
    });
});
