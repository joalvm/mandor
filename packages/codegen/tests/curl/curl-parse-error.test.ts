import { describe, expect, it } from 'vitest';

import { CurlParseError } from '../../src/curl/curl-parse-error.js';

describe('the error of a curl that cannot be read', () => {
    it('carries the reason and the subject', () => {
        const error = new CurlParseError('missingArgument', '--header');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('CurlParseError');
        expect(error.reason).toBe('missingArgument');
        expect(error.subject).toBe('--header');
        expect(error.message).toBe('the curl cannot be read: missingArgument');
    });

    it('needs no subject', () => {
        expect(new CurlParseError('noUrl').subject).toBeUndefined();
    });
});
