import { describe, expect, it } from 'vitest';

import { redirectPortIn } from '../src/lib/redirect-port.js';

describe('the port a redirect field names', () => {
    it('is the number typed, while it is one the file may hold', () => {
        expect(redirectPortIn('8080')).toBe(8080);
        expect(redirectPortIn('1024')).toBe(1024);
        expect(redirectPortIn('65535')).toBe(65_535);
    });

    it('is none for a privileged port, one that does not exist, half a number or nothing', () => {
        expect(['80', '65536', '80.5', 'abc', ''].map(redirectPortIn)).toEqual([
            null,
            null,
            null,
            null,
            null,
        ]);
    });
});
