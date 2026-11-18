import { describe, expect, it } from 'vitest';

import { harDocumentSchema } from '../../../src/har/document/har-schema.js';
import { fixtureText } from '../support/fixture.js';

describe('harDocumentSchema', () => {
    it('reads a recording a browser wrote', () => {
        const result = harDocumentSchema.safeParse(JSON.parse(fixtureText('chrome.har')));

        expect(result.success).toBe(true);
    });

    it('refuses an entry that has no URL', () => {
        const result = harDocumentSchema.safeParse({
            log: { entries: [{ request: { method: 'GET' } }] },
        });

        expect(result.success).toBe(false);
    });

    it('keeps the keys a browser adds, because they are not its business', () => {
        const result = harDocumentSchema.parse(JSON.parse(fixtureText('chrome.har')));

        expect(result.log.entries[0]).toMatchObject({
            _initiator: { type: 'script' },
            _resourceType: 'fetch',
        });
    });

    it('fills the lists and texts a recorder may leave out', () => {
        const result = harDocumentSchema.parse({
            log: {
                entries: [
                    {
                        request: { method: 'POST', url: 'https://a.test/', postData: {} },
                        response: { status: 200, content: {} },
                    },
                ],
            },
        });
        const [entry] = result.log.entries;

        expect(entry?.request.headers).toEqual([]);
        expect(entry?.request.postData?.mimeType).toBe('');
        expect(entry?.response?.statusText).toBe('');
        expect(entry?.response?.content?.mimeType).toBe('');
    });
});
