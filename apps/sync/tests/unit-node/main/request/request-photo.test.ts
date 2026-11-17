import { createRequestItem, type FolderChainLevel, type RequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    applyScriptEffects,
    noEffects,
} from '../../../../src/main/request/apply-script-effects.js';
import { requestPhoto, sentHeaders } from '../../../../src/main/request/request-photo.js';

function line(key: string, value: string, enabled = true) {
    return { key, value, enabled };
}

const CHAIN: FolderChainLevel[] = [
    {
        level: 'collection',
        place: { kind: 'folder', path: 'Store' },
        name: 'Store',
        settings: { headers: [line('X-Store', '{{token}}'), line('Accept', '*/*')] },
    },
];

const REQUEST: RequestItem = {
    ...createRequestItem({ name: 'List' }),
    url: '{{baseUrl}}/orders',
    method: 'POST',
    headers: [line('Accept', 'text/plain'), line('X-Off', 'x', false), line('', 'nameless')],
    query: [line('page', '{{page}}'), line('off', '1', false)],
    body: { type: 'json', content: '{"a": "{{a}}"}' },
};

describe('requestPhoto', () => {
    it('shows the request as written, with the headers it inherits and only the lines that go', () => {
        expect(requestPhoto(CHAIN, noEffects(REQUEST))).toEqual({
            url: '{{baseUrl}}/orders',
            method: 'POST',
            headers: [
                { name: 'X-Store', value: '{{token}}' },
                { name: 'Accept', value: 'text/plain' },
            ],
            query: [{ name: 'page', value: '{{page}}' }],
            body: { type: 'json', text: '{"a": "{{a}}"}' },
        });
    });

    it('shows a body that is not text by its type alone', () => {
        const binary = { ...REQUEST, body: { type: 'binary' as const, file: 'secret.bin' } };

        expect(requestPhoto(CHAIN, noEffects(binary)).body).toEqual({ type: 'binary', text: '' });
    });

    it('leaves out an inherited header a script deleted, here and in what is sent', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'x-store', op: 'delete' },
        ]);

        expect(sentHeaders(CHAIN, applied).map(({ key }) => key)).toEqual(['Accept', 'X-Off', '']);
        expect(requestPhoto(CHAIN, applied).headers).toEqual([
            { name: 'Accept', value: 'text/plain' },
        ]);
    });
});
