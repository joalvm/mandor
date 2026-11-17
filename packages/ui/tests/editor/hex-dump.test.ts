import { describe, expect, it } from 'vitest';

import {
    DEFAULT_HEX_ROW_WIDTH,
    hexDump,
    hexRowWidthOf,
    HEX_ROW_WIDTHS,
} from '../../src/editor/hex-dump.js';

/** The column the text of a line starts on: offset, colon and air, sixteen cells, two of air. */
const TEXT_COLUMN = 8 + 2 + (16 * 3 - 1) + 2;

const ENCODER = new TextEncoder();

function bytesOf(text: string): Uint8Array {
    return ENCODER.encode(text);
}

describe('the dump of a frame that was never text', () => {
    it('prints the offset, the sixteen bytes in capitals and what they spell', () => {
        expect(hexDump(bytesOf('{"error":true,"c'))).toBe(
            '00000000: 7B 22 65 72 72 6F 72 22 3A 74 72 75 65 2C 22 63  {"error":true,"c',
        );
    });

    it('marks with a dot the bytes that spell nothing', () => {
        const line = hexDump(bytesOf('\x00\x01hola'));

        expect(line.startsWith('00000000: 00 01 68 6F 6C 61')).toBe(true);
        expect(line.slice(TEXT_COLUMN)).toBe('..hola');
    });

    it('starts a new line every sixteen bytes, with the offset of the line', () => {
        const lines = hexDump(bytesOf('a'.repeat(33))).split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[1]?.startsWith('00000010: 61 61')).toBe(true);
        expect(lines[2]?.startsWith('00000020: 61')).toBe(true);
    });

    /** A short trailing line keeps the text column where a full line puts it. */
    it('leaves the cells of a line that ends short blank instead of shifting the text', () => {
        const last = hexDump(bytesOf('a'.repeat(17))).split('\n')[1] ?? '';

        expect(last.slice(0, TEXT_COLUMN).trimEnd()).toBe('00000010: 61');
        expect(last.slice(TEXT_COLUMN)).toBe('a');
    });

    /** A frame that arrived as text travelled as UTF-8, and its bytes are what is dumped. */
    it('dumps the bytes that carried a character, not its code unit', () => {
        expect(hexDump(bytesOf('\x00é')).startsWith('00000000: 00 C3 A9  ')).toBe(true);
    });

    it('prints nothing for an empty frame', () => {
        expect(hexDump(new Uint8Array())).toBe('');
    });
});

describe('the layout of a dump', () => {
    it('breaks the lines where the reader asked, not every sixteen bytes', () => {
        const lines = hexDump(bytesOf('a'.repeat(17)), { bytesPerRow: 8 }).split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[1]).toBe('00000008: 61 61 61 61 61 61 61 61  aaaaaaaa');
    });

    /** Wider lines are what a reader with room asks for, and the offsets follow them. */
    it('numbers the lines by the width it was given', () => {
        const lines = hexDump(bytesOf('a'.repeat(33)), { bytesPerRow: 32 }).split('\n');

        expect(lines).toHaveLength(2);
        expect(lines[1]?.startsWith('00000020: 61  ')).toBe(true);
    });

    /** Without the text there is nothing to line up, so the cells end the line. */
    it('drops the text and the air before it when the reader only wants the bytes', () => {
        expect(hexDump(bytesOf('ab'), { ascii: false })).toBe('00000000: 61 62');
    });

    it('offers the widths a dump can be read in', () => {
        expect(HEX_ROW_WIDTHS).toEqual([8, 16, 32]);
    });

    it('reads the width the band names, and falls back to the usual line on any other', () => {
        expect(hexRowWidthOf('32')).toBe(32);
        expect(hexRowWidthOf('12')).toBe(DEFAULT_HEX_ROW_WIDTH);
        expect(DEFAULT_HEX_ROW_WIDTH).toBe(16);
    });
});
