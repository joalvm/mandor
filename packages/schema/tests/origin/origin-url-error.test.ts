import { describe, expect, it } from 'vitest';

import { OriginUrlError } from '../../src/origin/origin-url-error.js';
import { splitOriginUrl } from '../../src/origin/origin-url.js';

describe('OriginUrlError', () => {
    it('carries the offending value so the log can quote it', () => {
        const error = new OriginUrlError('ftp://x');

        expect(error.value).toBe('ftp://x');
        expect(error.message).toBe('Invalid origin url: "ftp://x"');
    });

    it('is an Error that names itself', () => {
        const error = new OriginUrlError('x');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('OriginUrlError');
    });

    it('is what splitting a url that names no origin throws', () => {
        expect(() => splitOriginUrl('ftp://example.com/repo.git')).toThrow(OriginUrlError);
    });
});
