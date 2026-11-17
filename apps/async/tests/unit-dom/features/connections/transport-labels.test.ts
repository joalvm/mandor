import { describe, expect, it } from 'vitest';

import { TRANSPORT_LABELS } from '../../../../src/renderer/features/connections/lib/transport-labels.js';

describe('how a transport names itself', () => {
    it('gives every transport its message key', () => {
        expect(TRANSPORT_LABELS).toEqual({
            socketio: 'transportSocketio',
            websocket: 'transportWebsocket',
        });
    });
});
