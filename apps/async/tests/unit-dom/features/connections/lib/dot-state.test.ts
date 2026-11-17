import type { WsState } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { dotStateFor } from '../../../../../src/renderer/features/connections/lib/dot-state.js';

describe('the face of the dot of a connection', () => {
    it.each<[WsState, string]>([
        ['idle', 'disconnected'],
        ['connecting', 'connecting'],
        ['reconnecting', 'connecting'],
        ['open', 'connected'],
        ['closing', 'disconnected'],
        ['closed', 'disconnected'],
        ['error', 'error'],
    ])('paints a socket that is %s as %s', (state, face) => {
        expect(dotStateFor(state)).toBe(face);
    });
});
