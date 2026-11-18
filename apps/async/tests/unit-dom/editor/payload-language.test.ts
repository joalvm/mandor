import { FORMAT_BYTES } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { payloadLanguage } from '../../../src/renderer/editor/payload-language.js';

describe('payloadLanguage', () => {
    /** A declared type is a decision: the editor obeys it whatever the draft looks like. */
    it('writes a payload declared as json with comments allowed', () => {
        expect(payloadLanguage('json', '{"id":1}')).toBe('jsonc');
        expect(payloadLanguage('json', 'not json yet')).toBe('jsonc');
    });

    it('reads a payload declared as text, because text declares nothing', () => {
        expect(payloadLanguage('text', '{"id":1}')).toBe('jsonc');
        expect(payloadLanguage('text', '<note><to>Ana</to></note>')).toBe('xml');
        expect(payloadLanguage('text', 'hello')).toBe('plaintext');
    });

    /** A hex view is read-only and the person is here to type: a draft is never shown as bytes. */
    it('never shows a draft as bytes, however it will be sent', () => {
        expect(payloadLanguage('binary', '{"id":1}')).toBe('plaintext');
        expect(payloadLanguage('text', 'a\u0000b')).toBe('plaintext');
    });

    /** Reading a draft of megabytes on every key parsed all of it: 42 ms a key at 5 MB. */
    it('reads nothing of a draft past the size the editor colours, and colours none of it', () => {
        const big = `[${'1,'.repeat(FORMAT_BYTES / 2)}1]`;

        expect(payloadLanguage('text', big)).toBe('plaintext');
        expect(payloadLanguage('json', big)).toBe('jsonc');
    });
});
