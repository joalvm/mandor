import { describe, expect, it } from 'vitest';

import { formatOf } from '../../src/interop/format-of.js';
import { fixtureFormat } from './fixture-format.js';

describe('the format a request names', () => {
    it('is the one the app listed under that id', () => {
        expect(formatOf([fixtureFormat], 'fixture')).toEqual({ ok: true, value: fixtureFormat });
    });

    it('is refused when the app listed none by that id', () => {
        expect(formatOf([fixtureFormat], 'openapi')).toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
        expect(formatOf([], 'fixture')).toMatchObject({ ok: false });
    });
});
