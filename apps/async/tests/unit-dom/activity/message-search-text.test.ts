import { describe, expect, it } from 'vitest';

import type { ActivityRecord } from '@mandor/ipc';

import { messageSearchText } from '../../../src/renderer/activity/lib/message-search-text.js';

describe('the text a frame carries to the search', () => {
    it('joins the named event and the whole payload', () => {
        const record: ActivityRecord = {
            at: 1,
            data: '{"orderId":"a-1"}',
            direction: 'out',
            event: 'order.created',
        };

        expect(messageSearchText(record)).toBe('order.created {"orderId":"a-1"}');
    });

    it('says the payload alone when the frame came over a transport with no names', () => {
        const record: ActivityRecord = { at: 1, data: 'plain frame', direction: 'in' };

        expect(messageSearchText(record)).toBe('plain frame');
    });

    /** The base64 of bytes is not what arrived: reading a protocol by it finds nothing true. */
    it('carries the name alone for a frame that was never text', () => {
        const record: ActivityRecord = {
            at: 1,
            binary: true,
            data: 'AAECAw==',
            direction: 'in',
            event: 'order.created',
        };

        expect(messageSearchText(record)).toBe('order.created');
    });
});
