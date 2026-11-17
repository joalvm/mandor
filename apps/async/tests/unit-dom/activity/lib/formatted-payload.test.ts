import { describe, expect, it } from 'vitest';

import { formattedPayload } from '../../../../src/renderer/activity/lib/formatted-payload.js';

describe('the payload of a frame as it reads', () => {
    it('lays out json over several lines', () => {
        const laidOut = formattedPayload('{"a":1,"b":[1,2]}');

        expect(laidOut.split('\n').length).toBeGreaterThan(1);
        expect(JSON.parse(laidOut)).toEqual({ a: 1, b: [1, 2] });
    });

    /** Only whitespace moves: a number too long for a double reads as it was sent. */
    it('keeps a number too long for a double as it was sent', () => {
        expect(formattedPayload('{"id":12345678901234567890}')).toContain('12345678901234567890');
    });

    it('leaves text exactly as it came', () => {
        expect(formattedPayload('  hola   mundo ')).toBe('  hola   mundo ');
    });

    it('leaves xml exactly as it came', () => {
        const xml = '<a><b>1</b></a>';

        expect(formattedPayload(xml)).toBe(xml);
    });

    it('leaves json it cannot read exactly as it came', () => {
        expect(formattedPayload('{"a":', 'json')).toBe('{"a":');
    });

    it('lays out only what the format asked says is json', () => {
        expect(formattedPayload('{"a":1}', 'text')).toBe('{"a":1}');
    });
});
