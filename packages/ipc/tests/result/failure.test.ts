import { describe, expect, it } from 'vitest';

import { failure } from '../../src/index.js';

describe('failure', () => {
    it('builds an Err that carries the code for the UI and the message for the log', () => {
        expect(failure('git-missing', 'no git on PATH')).toEqual({
            ok: false,
            error: { code: 'git-missing', message: 'no git on PATH' },
        });
    });
});
