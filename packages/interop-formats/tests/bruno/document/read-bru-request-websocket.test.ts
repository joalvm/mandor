import { describe, expect, it } from 'vitest';

import type { BrunoSkipped } from '../../../src/bruno/document/bruno-tree.js';
import { requestOfBru } from '../../../src/bruno/document/read-bru-request.js';

function file(path: string, text: string) {
    return { path, text };
}

describe('requestOfBru: a ws request', () => {
    it('reads a ws request as a WebSocket request, with the messages it keeps', () => {
        const text = [
            'meta {',
            '  name: Feed',
            '  type: ws',
            '  seq: 2',
            '}',
            '',
            'ws {',
            '  url: wss://x.test/feed',
            '}',
            '',
            'body:ws {',
            '  name: Hola',
            '  type: text',
            "  content: '''",
            '    hola',
            "  '''",
            '}',
            '',
        ].join('\n');
        const skipped: BrunoSkipped[] = [];

        expect(requestOfBru(file('Feed.bru', text), skipped)).toMatchObject([
            {
                kind: 'websocket',
                name: 'Feed',
                seq: 2,
                url: 'wss://x.test/feed',
                messages: [{ title: 'Hola', type: 'text', data: 'hola' }],
            },
        ]);
        expect(skipped).toEqual([]);
    });
});
