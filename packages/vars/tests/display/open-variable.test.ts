import { describe, expect, it } from 'vitest';

import { openVariable } from '../../src/index.js';

describe('reading the variable being written', () => {
    it('returns null when the text holds no opening', () => {
        expect(openVariable('wss://example.com')).toBeNull();
    });

    it('returns the name being written after the opening', () => {
        expect(openVariable('wss://{{ho')).toBe('ho');
    });

    it('returns an empty name when only the braces are written', () => {
        expect(openVariable('wss://{{')).toBe('');
    });

    it('returns the name of the last opening still open', () => {
        expect(openVariable('{{host}} and {{to')).toBe('to');
    });

    it('returns null when the opening closed', () => {
        expect(openVariable('{{host}}/socket')).toBeNull();
    });

    it('returns null when the name holds an opening brace', () => {
        expect(openVariable('{{ho{st')).toBeNull();
    });

    it('returns null when the name holds a closing brace', () => {
        expect(openVariable('{{ho}st')).toBeNull();
    });

    it('returns null when the name spans a line break', () => {
        expect(openVariable('{{ho\nst')).toBeNull();
    });

    /** A backslash escapes the braces: nothing is being written there. */
    it('returns null when the opening is escaped', () => {
        expect(openVariable('Bearer \\{{host')).toBeNull();
    });

    it('returns the name of the last unescaped opening', () => {
        expect(openVariable('\\{{first {{second')).toBe('second');
    });

    /** The braces may already carry their close: the name is what the caret has written. */
    it('reads the name only up to the offset it is told', () => {
        expect(openVariable('{{deviceType}}', 9)).toBe('deviceT');
        expect(openVariable('{{deviceType}}', 12)).toBe('deviceType');
    });

    it('reads nothing when the caret stands before the opening', () => {
        expect(openVariable('wss://{{host', 3)).toBeNull();
    });

    it('reads nothing when the name met a brace before the caret', () => {
        expect(openVariable('{{de}} and {{ho', 9)).toBeNull();
    });
});
