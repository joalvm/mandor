import { describe, expect, it } from 'vitest';

import { brunoFormat } from '../../src/bruno/bruno-format.js';
import { folderFiles, fixtureText } from './support/fixture.js';

describe('brunoFormat', () => {
    it('is listed as a format that reads a folder and writes YAML, for a collection and for a workspace', () => {
        expect(brunoFormat).toMatchObject({
            id: 'bruno',
            label: 'Bruno',
            reads: ['yml', 'bru', 'json'],
            writes: ['yml'],
            scopes: ['collection', 'workspace'],
            input: 'folder',
        });
    });

    it('says what a Bruno collection has no place for', () => {
        expect(Object.keys(brunoFormat.unwritten).sort()).toEqual(['doc', 'socketio']);
    });

    it('recognises a folder of either layout by its root file, and nothing else', () => {
        expect(brunoFormat.sniff(folderFiles('oc'))).toBe(true);
        expect(brunoFormat.sniff(folderFiles('bru'))).toBe(true);
        expect(brunoFormat.sniff([{ path: 'x.json', text: '[]' }])).toBe(false);
        expect(brunoFormat.sniff([])).toBe(false);
    });

    it('recognises the root file of each layout dropped alone', () => {
        expect(
            brunoFormat.sniff([
                { path: 'opencollection.yml', text: fixtureText('opencollection.yml') },
            ]),
        ).toBe(true);
        expect(brunoFormat.sniff([{ path: 'bruno.json', text: fixtureText('bruno.json') }])).toBe(
            true,
        );
    });

    it('loads its codec on demand', async () => {
        const codec = await brunoFormat.load();

        expect(typeof codec.read).toBe('function');
    });
});
