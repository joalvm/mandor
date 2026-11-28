import { describe, expect, it } from 'vitest';

import { formatByteSize } from '../../../../src/renderer/activity/lib/format-byte-size.js';

describe('the size of a frame in the log', () => {
    it('says exact bytes under a kilobyte', () => {
        expect(formatByteSize(0, 'en')).toBe('0 B');
        expect(formatByteSize(1023, 'en')).toBe('1023 B');
    });

    it('says kilobytes with one decimal from a kilobyte up', () => {
        expect(formatByteSize(1024, 'en')).toBe('1.0 KB');
        expect(formatByteSize(1536, 'en')).toBe('1.5 KB');
    });

    it('says megabytes with one decimal from a megabyte up', () => {
        expect(formatByteSize(1024 * 1024, 'en')).toBe('1.0 MB');
        expect(formatByteSize(5 * 1024 * 1024 + 512 * 1024, 'en')).toBe('5.5 MB');
    });

    it('writes the number the way the language of the window does', () => {
        expect(formatByteSize(1536, 'es')).toBe('1,5 KB');
    });
});
