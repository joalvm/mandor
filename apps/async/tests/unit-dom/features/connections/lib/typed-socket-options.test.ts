import { describe, expect, it } from 'vitest';

import {
    enginePathWritable,
    frameReads,
    namespaceWritable,
    subprotocolsDialable,
    subprotocolsOf,
} from '../../../../../src/renderer/features/connections/lib/typed-socket-options.js';

describe('the socket options as they are typed', () => {
    it('write a namespace or an engine path led by a slash, without spaces, that fits', () => {
        expect(namespaceWritable('/chat')).toBe(true);
        expect(namespaceWritable('chat')).toBe(false);
        expect(namespaceWritable(`/${'a'.repeat(256)}`)).toBe(false);
        expect(enginePathWritable('/socket.io')).toBe(true);
        expect(enginePathWritable('/socket io')).toBe(false);
    });

    it('read the subprotocols the commas leave, and dial only tokens, eight at most', () => {
        expect(subprotocolsOf(' graphql-ws, ,mqtt ')).toEqual(['graphql-ws', 'mqtt']);
        expect(subprotocolsDialable('graphql-ws, mqtt')).toBe(true);
        expect(subprotocolsDialable('graphql ws')).toBe(false);
        expect(
            subprotocolsDialable(Array.from({ length: 9 }, (_, n) => `p${String(n)}`).join(',')),
        ).toBe(false);
    });

    it('read a blank frame as the template going away, and refuse one too long to keep', () => {
        expect(frameReads('   ')).toBe(true);
        expect(frameReads('x'.repeat(65_537))).toBe(false);
    });
});
