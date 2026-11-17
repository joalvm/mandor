import { describe, expect, it } from 'vitest';

import { logLevelOf } from '../../src/log/log-level.js';

describe('the level the environment asks for', () => {
    it('takes a level the app knows', () => {
        expect(logLevelOf('debug')).toBe('debug');
    });

    /** A variable set by hand arrives with the case and spacing a person typed it with. */
    it('reads a level written with other spacing or case', () => {
        expect(logLevelOf('  WARN ')).toBe('warn');
    });

    it('falls back to info when the variable is unset', () => {
        expect(logLevelOf(undefined)).toBe('info');
    });

    /**
     * A typo in a variable is not worth a process that refuses to start, and a level nobody
     * recognises is not worth a log that says nothing.
     */
    it('falls back to info when the variable says something else', () => {
        expect(logLevelOf('verbose')).toBe('info');
    });
});
