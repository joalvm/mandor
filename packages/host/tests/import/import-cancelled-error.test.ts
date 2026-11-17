import { describe, expect, it } from 'vitest';

import { ImportCancelledError } from '../../src/import/import-cancelled-error.js';
import { failureOf } from '../../src/ipc/failure-of.js';

describe('the error of an import the person stopped', () => {
    it('crosses the bridge under a code of its own', () => {
        expect(failureOf(new ImportCancelledError())).toMatchObject({
            ok: false,
            error: { code: 'import-cancelled' },
        });
    });
});
