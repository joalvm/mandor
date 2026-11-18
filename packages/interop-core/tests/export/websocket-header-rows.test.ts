import { describe, expect, it } from 'vitest';

import { websocketHeaderRows } from '../../src/export/websocket-header-rows.js';

function line(key: string, value: string, enabled = true) {
    return { key, value, enabled };
}

describe('websocketHeaderRows', () => {
    it('lists the headers that are sent as they are', () => {
        expect(websocketHeaderRows({ headers: [line('duration', '5')] })).toEqual([
            { name: 'duration', value: '5' },
        ]);
    });

    it('sends the subprotocols in the one header the handshake has for them', () => {
        const rows = websocketHeaderRows({
            headers: [line('a', 'b')],
            websocket: { subprotocols: ['chat', 'superchat'] },
        });

        expect(rows).toEqual([
            { name: 'a', value: 'b' },
            { name: 'Sec-WebSocket-Protocol', value: 'chat, superchat' },
        ]);
    });

    it('offers no header when the connection offers no subprotocol', () => {
        expect(websocketHeaderRows({ headers: [], websocket: { subprotocols: [] } })).toEqual([]);
    });

    it('keeps the headers switched off, marked, after the ones that are sent', () => {
        const rows = websocketHeaderRows({ headers: [line('x', '1', false), line('a', 'b')] });

        expect(rows).toEqual([
            { name: 'a', value: 'b' },
            { name: 'x', value: '1', disabled: true },
        ]);
    });
});
