import { createMessageItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { messagesStore } from '../../../../src/renderer/features/messages/messages-store.js';

const MESSAGE = createMessageItem({ name: 'saludo', payload: 'hola' });

describe('the messages store when the last view of a message is gone', () => {
    it('forgets what was loaded and what was being read, and keeps the others', () => {
        const messages = messagesStore.getState();

        messages.reset();
        messages.beginRead('m1');
        messages.finishRead('m1', MESSAGE);
        messages.beginRead('m1');
        messages.setMessage('m2', MESSAGE);
        messages.forget('m1');

        expect(messagesStore.getState().messages).toEqual({ m2: MESSAGE });
        expect(messagesStore.getState().reading).toEqual([]);
    });

    it('does not bring it back when a read lands after', () => {
        const messages = messagesStore.getState();

        messages.reset();
        messages.beginRead('m1');
        messages.forget('m1');
        messages.finishRead('m1', MESSAGE);

        expect(messagesStore.getState().messages).toEqual({});
    });
});
