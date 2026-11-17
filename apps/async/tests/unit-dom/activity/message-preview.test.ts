import { describe, expect, it } from 'vitest';

import { messagePreview } from '../../../src/renderer/activity/lib/message-preview.js';

function text(data: string) {
    return { data };
}

describe('the head of a frame as a row shows it', () => {
    it('keeps a short payload whole', () => {
        expect(messagePreview(text('{"ok":true}'))).toBe('{"ok":true}');
    });

    it('stops at the first line break', () => {
        expect(messagePreview(text('first\nsecond'))).toBe('first');
    });

    it('cuts a long line down and says it was cut', () => {
        const preview = messagePreview(text('x'.repeat(5000)));

        expect(preview).toHaveLength(201);
        expect(preview.endsWith('…')).toBe(true);
    });

    /** The base64 a binary frame travelled in is not what arrived: the bytes are. */
    it('previews a binary frame as the bytes it starts with', () => {
        expect(messagePreview({ binary: true, data: 'AAEC/w==' })).toBe('00 01 02 FF');
    });

    it('says a binary frame goes on past the bytes the row shows', () => {
        const preview = messagePreview({ binary: true, data: 'AA'.repeat(40) });

        expect(preview.startsWith('00 ')).toBe(true);
        expect(preview.endsWith('…')).toBe(true);
    });
});
