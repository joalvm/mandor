import { describe, expect, it } from 'vitest';

import {
    base64OfBytes,
    bytesOfEncoded,
    joinedBytes,
    textOfBytes,
    textSampleOf,
} from '../../../src/renderer/response/lib/body-bytes.js';

describe('bytesOfEncoded', () => {
    it('gives the bytes of the text the bridge carried', () => {
        expect(Array.from(bytesOfEncoded({ encoding: 'utf8', text: 'añ' }))).toEqual([
            97, 195, 177,
        ]);
    });

    it('gives the bytes of the base64 the bridge carried', () => {
        expect(Array.from(bytesOfEncoded({ data: 'AP8B', encoding: 'base64' }))).toEqual([
            0, 255, 1,
        ]);
    });
});

describe('joinedBytes', () => {
    it('puts the window that arrived after the ones already read', () => {
        const joined = joinedBytes(Uint8Array.of(1, 2), Uint8Array.of(3), 3);

        expect(Array.from(joined)).toEqual([1, 2, 3]);
    });

    /** Copying all that was read for every window made reading a body whole cost its square. */
    it('grows in the room it keeps, leaving what was read before as it was', () => {
        const first = joinedBytes(new Uint8Array(0), Uint8Array.of(1, 2), 8);
        const second = joinedBytes(first, Uint8Array.of(3), 8);

        expect(Array.from(second)).toEqual([1, 2, 3]);
        expect(Array.from(first)).toEqual([1, 2]);
        expect(second.buffer).toBe(first.buffer);
    });

    it('moves a body read a window at a time only a few times, never past its whole size', () => {
        const window = new Uint8Array(16).fill(7);
        const whole = 16 * 1000;
        const rooms = new Set<ArrayBufferLike>();
        let read: Uint8Array = new Uint8Array(0);

        while (read.length < whole) {
            read = joinedBytes(read, window, whole);
            rooms.add(read.buffer);
        }

        expect(read.length).toBe(whole);
        expect(read.every((byte) => byte === 7)).toBe(true);
        expect(rooms.size).toBeLessThanOrEqual(11);
        expect(read.buffer.byteLength).toBe(whole);
    });
});

describe('textOfBytes', () => {
    it('reads utf-8', () => {
        expect(textOfBytes(new TextEncoder().encode('añ'))).toBe('añ');
    });

    it('does not fail on a character a window cut in half', () => {
        expect(textOfBytes(Uint8Array.of(97, 195))).toBe('a�');
    });
});

describe('textSampleOf', () => {
    it('reads text', () => {
        expect(textSampleOf(new TextEncoder().encode('añ'))).toBe('añ');
    });

    it('is empty for a body with nothing in it', () => {
        expect(textSampleOf(new Uint8Array(0))).toBe('');
    });

    it('is nothing for bytes that are not utf-8', () => {
        expect(textSampleOf(Uint8Array.of(0xff, 0xfe, 0x00))).toBeNull();
    });

    it('forgives a character the end of the sample cut in half', () => {
        const bytes = new Uint8Array(4097).fill(97);

        bytes.set([0xc3, 0xb1], 4095);

        expect(textSampleOf(bytes)?.length).toBe(4095);
    });
});

describe('base64OfBytes', () => {
    it('writes bytes the way atob reads them back', () => {
        const bytes = Uint8Array.of(0, 255, 1);

        expect(base64OfBytes(bytes)).toBe('AP8B');
    });

    it('does not break on a body of more than one piece', () => {
        const bytes = new Uint8Array(0x8000 * 2 + 5).fill(65);

        expect(atob(base64OfBytes(bytes))).toBe('A'.repeat(bytes.length));
    });
});
