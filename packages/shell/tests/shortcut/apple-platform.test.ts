import { afterEach, describe, expect, it, vi } from 'vitest';

import { isApplePlatform } from '../../src/shortcut/apple-platform.js';

afterEach(() => {
    vi.unstubAllGlobals();
});

function readingOn(userAgent: string): boolean {
    vi.stubGlobal('navigator', { userAgent });

    return isApplePlatform();
}

describe('whether the keyboard being read has a Cmd key', () => {
    it('has one on a Mac and on the devices of the same family', () => {
        expect(readingOn('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe(true);
        expect(readingOn('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
        expect(readingOn('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    });

    it('has none on Windows or Linux', () => {
        expect(readingOn('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
        expect(readingOn('Mozilla/5.0 (X11; Linux x86_64)')).toBe(false);
    });
});
