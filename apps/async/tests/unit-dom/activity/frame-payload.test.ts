import { FORMAT_BYTES } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import {
    frameByteLength,
    frameFormat,
    frameHead,
    framePayload,
} from '../../../src/renderer/activity/lib/frame-payload.js';

const TEXT = { at: 1_700_000_000_000, data: 'hola', direction: 'in' } as const;
const BYTES = { ...TEXT, binary: true, data: 'AAEC/w==' } as const;

describe('what a frame of the timeline carries', () => {
    it('hands a text frame its text, untouched', () => {
        expect(framePayload(TEXT)).toEqual({ kind: 'text', text: 'hola' });
    });

    /** The frame crossed the bridge encoded: what it carried are the bytes, not that text. */
    it('decodes a binary frame back into the bytes that arrived', () => {
        expect(framePayload(BYTES)).toEqual({
            bytes: new Uint8Array([0, 1, 2, 0xff]),
            kind: 'bytes',
        });
    });

    it('weighs a text frame in the bytes it took on the wire, not in code units', () => {
        expect(frameByteLength({ ...TEXT, data: 'héroe' })).toBe(6);
    });

    /** A frame is weighed a stretch at a time; a pair that spans two stretches is still four bytes. */
    it('weighs a frame longer than one stretch, a character split across two included', () => {
        const data = `${'a'.repeat(65_535)}😀${'é'.repeat(70_000)}`;

        expect(frameByteLength({ ...TEXT, data })).toBe(new TextEncoder().encode(data).length);
    });

    /** A half of a pair alone goes out as the replacement character, three bytes on the wire. */
    it('weighs a lone half of a pair as the character that replaces it', () => {
        expect(frameByteLength({ ...TEXT, data: 'a\uD83D' })).toBe(4);
    });

    /** A dump of a text frame stops at the byte it was asked for, a character cut in two or not. */
    it('takes the head of a text frame in bytes, never past the count', () => {
        expect([...frameHead({ ...TEXT, data: 'é'.repeat(10) }, 5)]).toEqual([
            0xc3, 0xa9, 0xc3, 0xa9, 0xc3,
        ]);
    });

    /** Base64 grows a third: the weight of the frame is what the socket carried. */
    it('weighs a binary frame in the bytes it carried, never in the text that brought them', () => {
        expect(frameByteLength(BYTES)).toBe(4);
        expect(frameByteLength({ ...BYTES, data: 'AAEC' })).toBe(3);
    });
});

describe('what a frame turns out to be', () => {
    it('names a frame that parses as JSON, and one that never was text', () => {
        expect(frameFormat({ data: '{"id":7}' })).toBe('json');
        expect(frameFormat({ binary: true, data: 'AAEC/w==' })).toBe('binary');
    });

    /**
     * A frame past the cut is shown as it came, never laid out. Parsing the whole of one to name
     * it took two seconds and a half at a hundred megabytes, frozen, the moment it was opened.
     */
    it('reads a frame too large to lay out by its start, never the whole of it', () => {
        const data = `{"rows":[${'1,'.repeat(FORMAT_BYTES)}1]}`;
        const parse = vi.spyOn(JSON, 'parse');
        const format = frameFormat({ data });
        const whole = parse.mock.calls.some(([text]) => text.length > FORMAT_BYTES);

        parse.mockRestore();
        expect(whole).toBe(false);
        expect(format).toBe('text');
    });

    it('still names bytes no text frame carries at the start of a frame too large to lay out', () => {
        expect(frameFormat({ data: `\u0000${'a'.repeat(FORMAT_BYTES)}` })).toBe('binary');
    });
});
