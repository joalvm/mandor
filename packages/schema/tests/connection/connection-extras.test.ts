import { describe, expect, it } from 'vitest';

import { connectionExtrasOf } from '../../src/connection/connection-extras.js';

describe('connectionExtrasOf', () => {
    it('reads the parts a document carries beside the address', () => {
        const extras = connectionExtrasOf({
            name: 'Pedidos',
            url: 'wss://x.test',
            headers: [
                { key: 'X-Token', value: '{{token}}', enabled: true },
                { key: 'X-Off', value: '1', enabled: false },
            ],
            params: [{ key: 'sala', value: '1', enabled: true }],
            description: 'Canal de pedidos.',
            auth: { type: 'bearer', token: '{{token}}' },
            websocket: { subprotocols: ['json', 'v2'] },
            socketio: { namespace: '/pedidos' },
            retry: { attempts: 3 },
            keepalive: { enabled: true },
        });

        expect(extras).toEqual({
            headers: [
                { key: 'X-Token', value: '{{token}}', enabled: true },
                { key: 'X-Off', value: '1', enabled: false },
            ],
            params: [{ key: 'sala', value: '1', enabled: true }],
            description: 'Canal de pedidos.',
            auth: { type: 'bearer', token: '{{token}}' },
            websocket: { subprotocols: ['json', 'v2'] },
            socketio: { namespace: '/pedidos' },
            retry: { attempts: 3 },
            keepalive: { enabled: true },
        });
    });

    it('says nothing about a part the document does not carry', () => {
        expect(connectionExtrasOf({ name: 'Pedidos', url: 'wss://x.test' })).toEqual({});
    });

    it('leaves out the part that is not valid and keeps the rest', () => {
        const extras = connectionExtrasOf({
            description: { not: 'a string' },
            headers: [{ key: 'A', value: '1', enabled: true }],
            websocket: { subprotocols: ['bad protocol'] },
        });

        expect(extras).toEqual({ headers: [{ key: 'A', value: '1', enabled: true }] });
    });
});
