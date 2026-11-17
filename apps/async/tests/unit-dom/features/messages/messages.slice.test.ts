import { describe, expect, it } from 'vitest';

import { initialMessagesSlice } from '../../../../src/renderer/features/messages/messages.slice.js';

describe('the starting point of the messages slice', () => {
    it('holds no message and no read in flight', () => {
        expect(initialMessagesSlice()).toEqual({ messages: {}, reading: [] });
    });

    /** A store born from a shared object would leak what one origin fed into the next. */
    it('hands out a fresh slice each time', () => {
        const first = initialMessagesSlice();

        first.reading.push('mandor://demo/events/item/pedido');

        expect(initialMessagesSlice().reading).toEqual([]);
    });
});
