import { describe, expect, it } from 'vitest';

import { NetworkFileError } from '../../src/network/network-file-error.js';

describe('a certificate file that could not be read', () => {
    it('names the file and keeps what the disk said', () => {
        const cause = new Error('ENOENT');
        const error = new NetworkFileError('ca.pem', cause);

        expect(error.message).toContain('ca.pem');
        expect(error.cause).toBe(cause);
        expect(error.name).toBe('NetworkFileError');
    });
});
