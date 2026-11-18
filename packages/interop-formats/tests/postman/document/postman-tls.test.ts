import { TLS_VERSIONS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { POSTMAN_TLS } from '../../../src/postman/document/postman-tls.js';

describe('the versions of TLS Postman names', () => {
    it('are the ones Mandor bounds, oldest first', () => {
        expect(POSTMAN_TLS.map(([, version]) => version)).toEqual(
            TLS_VERSIONS.filter((version) => version !== 'auto'),
        );
    });
});
