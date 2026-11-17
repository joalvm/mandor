import { describe, expect, it } from 'vitest';

import { minimalEdit } from '../../src/editor/minimal-edit.js';

describe('the smallest edit between two texts', () => {
    it('asks for no edit when nothing changed', () => {
        expect(minimalEdit('{"a": 1}', '{"a": 1}')).toBeNull();
    });

    it('replaces only what differs between the shared ends', () => {
        expect(minimalEdit('{"a": 1}', '{"a": 2}')).toEqual({ from: 6, text: '2', to: 7 });
    });

    it('inserts without touching either side', () => {
        expect(minimalEdit('ab', 'aXb')).toEqual({ from: 1, text: 'X', to: 1 });
    });

    it('deletes without touching either side', () => {
        expect(minimalEdit('aXb', 'ab')).toEqual({ from: 1, text: '', to: 2 });
    });

    it('never counts the same character as both head and tail', () => {
        expect(minimalEdit('aaa', 'aa')).toEqual({ from: 2, text: '', to: 3 });
    });

    it('replaces everything when the two share nothing', () => {
        expect(minimalEdit('abc', 'xyz')).toEqual({ from: 0, text: 'xyz', to: 3 });
    });

    /** An edge inside a surrogate pair is moved by the editor and the edit lands one unit off. */
    it('keeps a character outside the basic plane whole', () => {
        const grin = String.fromCodePoint(0x1f600);
        const beam = String.fromCodePoint(0x1f601);

        expect(minimalEdit(`a${grin}`, `a${beam}`)).toEqual({ from: 1, text: beam, to: 3 });
        expect(minimalEdit(`${grin}b`, `${beam}b`)).toEqual({ from: 0, text: beam, to: 2 });
    });

    /** Ends longer than the widest span are compared span by span, down to one character. */
    it('finds the edges of a change deep inside a long text', () => {
        const before = 'ab'.repeat(70_001);
        const at = 70_001 + 4_099;
        const after = `${before.slice(0, at)}XY${before.slice(at + 1)}`;

        expect(minimalEdit(before, after)).toEqual({ from: at, text: 'XY', to: at + 1 });
    });

    it('appends to a long text without touching what it already reads', () => {
        const before = 'x'.repeat(66_000);

        expect(minimalEdit(before, `${before}tail`)).toEqual({
            from: 66_000,
            text: 'tail',
            to: 66_000,
        });
    });
});
