import { describe, expect, it } from 'vitest';

import { DEFAULT_MESSAGE_SECTION } from '../../../../../src/renderer/features/messages/lib/message-section.js';

describe('the section a message opens on', () => {
    /** The payload is what the item is for: the description is looked at when somebody wants it. */
    it('is the payload', () => {
        expect(DEFAULT_MESSAGE_SECTION).toBe('payload');
    });
});
