import { describe, expect, it } from 'vitest';

import { insomniaFormat } from '../../src/insomnia/insomnia-format.js';
import { fixtureText } from './support/fixture.js';

describe('insomniaFormat', () => {
    it('is listed as a format that reads JSON and YAML and writes YAML, for a collection and for a workspace', () => {
        expect(insomniaFormat).toMatchObject({
            id: 'insomnia',
            label: 'Insomnia',
            reads: ['json', 'yaml', 'yml'],
            writes: ['yaml'],
            scopes: ['collection', 'workspace'],
            input: 'files',
        });
    });

    it('says what an Insomnia file has no place for', () => {
        expect(Object.keys(insomniaFormat.unwritten).sort()).toEqual([
            'doc',
            'message',
            'socketio',
        ]);
    });

    it('recognises the collections of v4 and v5 together, and nothing else', () => {
        const v4 = { path: 'c.json', text: fixtureText('collection-v4.json') };
        const v5 = { path: 'c.yaml', text: fixtureText('collection-v5.yaml') };

        expect(insomniaFormat.sniff([v4, v5])).toBe(true);
        expect(insomniaFormat.sniff([v4, { path: 'x.json', text: '[]' }])).toBe(false);
        expect(insomniaFormat.sniff([])).toBe(false);
    });

    it('loads its codec on demand', async () => {
        const codec = await insomniaFormat.load();

        expect(typeof codec.read).toBe('function');
    });
});
