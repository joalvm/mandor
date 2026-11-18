import { describe, expect, it } from 'vitest';

import { postmanFormat } from '../../src/postman/postman-format.js';
import { fixtureText } from './support/fixture.js';

describe('postmanFormat', () => {
    it('is listed as a format that reads and writes JSON, for a collection and for a workspace', () => {
        expect(postmanFormat).toMatchObject({
            id: 'postman',
            label: 'Postman',
            reads: ['json'],
            writes: ['json'],
            scopes: ['collection', 'workspace'],
            input: 'files',
        });
    });

    it('says what a Postman file has no place for', () => {
        expect(Object.keys(postmanFormat.unwritten).sort()).toEqual([
            'connection',
            'doc',
            'message',
        ]);
    });

    it('recognises a collection with its environment, and nothing else', () => {
        const collection = { path: 'c.json', text: fixtureText('collection-v2.1.json') };
        const environment = { path: 'e.json', text: fixtureText('environment.json') };

        expect(postmanFormat.sniff([collection, environment])).toBe(true);
        expect(postmanFormat.sniff([collection, { path: 'x.json', text: '[]' }])).toBe(false);
        expect(postmanFormat.sniff([])).toBe(false);
    });
});
