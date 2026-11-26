import { describe, expect, it } from 'vitest';

import { cookieExpiryOf, cookiePairOf } from '../../../src/renderer/response/lib/cookie-cells.js';

describe('the cells of a cookie of a response', () => {
    it('writes a cookie as the pair a Cookie header carries', () => {
        expect(cookiePairOf({ httpOnly: false, name: 'sid', secure: false, value: 'a=b' })).toBe(
            'sid=a=b',
        );
    });

    it('says the end of a cookie as a day and an hour of the language', () => {
        const said = cookieExpiryOf('2027-11-26T06:13:48.000Z', 'en');

        expect(said).toContain('2027');
        expect(said).toContain('Nov');
    });

    it('has no end to say for a cookie of the session', () => {
        expect(cookieExpiryOf(undefined, 'es')).toBeNull();
    });

    it('shows an end no clock reads as it came', () => {
        expect(cookieExpiryOf('someday', 'es')).toBe('someday');
    });
});
