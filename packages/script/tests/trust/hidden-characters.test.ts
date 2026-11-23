import { describe, expect, it } from 'vitest';

import { hiddenCharactersIn, visibleName } from '../../src/index.js';

const HIDDEN = [
    0x202e, 0x2066, 0x200b, 0x2028, 0x2029, 0xfeff, 0x00ad, 0x061c, 0x180e, 0x2060, 0x2064, 0x206a,
    0x206f, 0x3164, 0xffa0, 0xfe0f, 0xe0041, 0x115f, 0xe000,
];

const SHOWN = ['A', ' ', '\u00A0', '\u3000', '\u0430'];

function hex(codePoint: number): string {
    return codePoint.toString(16).toUpperCase();
}

describe('hiddenCharactersIn', () => {
    it.each(HIDDEN.map((codePoint) => [hex(codePoint), codePoint]))(
        'counts U+%s as hidden',
        (_name, codePoint) => {
            expect(hiddenCharactersIn(`a${String.fromCodePoint(codePoint)}b`)).toBe(1);
        },
    );

    it.each(SHOWN)('leaves %j alone: it shows, or Monaco marks it', (character) => {
        expect(hiddenCharactersIn(`a${character}b`)).toBe(0);
    });

    it('counts every hidden character, not whether there is one', () => {
        expect(hiddenCharactersIn('\u202Eabc\u200B\u200Bdef\u{E0041}')).toBe(4);
    });

    it('counts the joiner of an emoji sequence, since the band never blocks', () => {
        expect(hiddenCharactersIn('👩\u200D💻')).toBe(1);
    });

    it('gives nothing for a plain or empty text', () => {
        expect(
            hiddenCharactersIn('mandor.variables.set("token", mandor.response.json().token);'),
        ).toBe(0);
        expect(hiddenCharactersIn('')).toBe(0);
    });
});

describe('visibleName', () => {
    it('writes every hidden character as its escape', () => {
        expect(visibleName('login\u202Etxt.js')).toBe('login\\u{202E}txt.js');
        expect(visibleName('\u{E0041}\u200B')).toBe('\\u{E0041}\\u{200B}');
    });

    it('leaves a plain name as it is', () => {
        expect(visibleName('Get token')).toBe('Get token');
    });

    it('cuts a long name to 80 characters, with a mark that it was cut', () => {
        const name = visibleName('x'.repeat(200));

        expect(Array.from(name)).toHaveLength(80);
        expect(name.endsWith('…')).toBe(true);
    });

    it('never cuts an escape in half', () => {
        const name = visibleName(`${'x'.repeat(75)}\u202Eyyyy`);

        expect(name).toBe(`${'x'.repeat(75)}…`);
    });

    it('counts characters, not UTF-16 units, so an emoji is never split', () => {
        const name = visibleName('😀'.repeat(100));

        expect(Array.from(name)).toHaveLength(80);
        expect(name).not.toContain('\uFFFD');
    });
});
