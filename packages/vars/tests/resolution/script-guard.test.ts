import { describe, expect, it } from 'vitest';

import { scriptGuard, type ScriptGuardInput } from '../../src/index.js';

const QUIET: ScriptGuardInput = {
    base: 'https://api.test/x',
    final: 'https://api.test/y',
    wroteHost: false,
    hostMoved: false,
    written: false,
    used: [{ name: 'host', level: 'environment', secret: false }],
};

describe('scriptGuard', () => {
    it('neither influenced nor moved when a script only read and tested', () => {
        expect(scriptGuard(QUIET)).toEqual({ influenced: false, destinationMoved: false });
    });

    it('influenced when a script wrote, or when a value of the script level resolved', () => {
        expect(scriptGuard({ ...QUIET, written: true }).influenced).toBe(true);
        expect(
            scriptGuard({ ...QUIET, used: [{ name: 'n', level: 'script', secret: false }] })
                .influenced,
        ).toBe(true);
    });

    it('moved when the origin changed, the base does not parse, or Host was touched', () => {
        expect(scriptGuard({ ...QUIET, final: 'https://evil.test/y' }).destinationMoved).toBe(true);
        expect(scriptGuard({ ...QUIET, base: '{{base}}/x' }).destinationMoved).toBe(true);
        expect(scriptGuard({ ...QUIET, wroteHost: true }).destinationMoved).toBe(true);
        expect(scriptGuard({ ...QUIET, hostMoved: true }).destinationMoved).toBe(true);
    });
});
