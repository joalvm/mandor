import { afterEach, describe, expect, it, vi } from 'vitest';

import { dynamicRandomInt } from '../../src/dynamic/dynamic-random-int.js';

afterEach(() => {
    vi.restoreAllMocks();
});

/** Makes the runtime crypto answer one fixed unsigned 32-bit number, as the code reads it. */
function cryptoAnswers(value: number): void {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((buffer: Uint32Array) => {
        new DataView(buffer.buffer).setUint32(0, value);

        return buffer;
    }) as typeof globalThis.crypto.getRandomValues);
}

describe('the random integer of a dynamic variable', () => {
    it('answers the lowest of the range when the crypto answers zero', () => {
        cryptoAnswers(0);

        expect(dynamicRandomInt()).toBe('0');
    });

    it('answers the highest of the range, included, when the crypto answers its largest', () => {
        cryptoAnswers(0xffffffff);

        expect(dynamicRandomInt()).toBe('1000');
    });

    it('spreads the range evenly: the middle of the numbers is the middle of the range', () => {
        cryptoAnswers(2 ** 31);

        expect(dynamicRandomInt()).toBe('500');
    });

    it('answers a whole number inside the range every time', () => {
        for (let attempt = 0; attempt < 50; attempt += 1) {
            const value = Number(dynamicRandomInt());

            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1000);
        }
    });
});
