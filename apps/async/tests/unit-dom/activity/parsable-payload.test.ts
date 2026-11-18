import { describe, expect, it } from 'vitest';

import { isParsablePayload } from '../../../src/renderer/activity/lib/parsable-payload.js';

describe('the payloads a row reads', () => {
    it('reads a json object', () => {
        expect(isParsablePayload('{"event":"x"}')).toBe(true);
    });

    it('leaves alone what is not an object or is empty', () => {
        expect(isParsablePayload('')).toBe(false);
        expect(isParsablePayload('[1]')).toBe(false);
        expect(isParsablePayload('hola')).toBe(false);
    });

    it('weighs a payload past the limit instead of parsing it', () => {
        expect(isParsablePayload(`{"pad":"${'a'.repeat(64 * 1024)}"}`)).toBe(false);
    });
});
