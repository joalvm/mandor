import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cookieJarFile } from '../../src/cookies/cookie-jar-path.js';

describe('where the cookie jar of an environment lives', () => {
    it('keeps one file per environment under .mandor, which never goes to git', () => {
        expect(cookieJarFile('/repo', 'pagos', 'staging')).toBe(
            join('/repo', '.mandor', 'cookies', 'pagos', 'staging.json'),
        );
    });

    it('keeps the jar of a workspace without environment apart from any environment', () => {
        expect(cookieJarFile('/repo', 'pagos', null)).toBe(
            join('/repo', '.mandor', 'cookies', 'pagos', '_none.json'),
        );
    });

    it('refuses an environment that is not an id segment', () => {
        expect(() => cookieJarFile('/repo', 'pagos', '../staging')).toThrow();
        expect(() => cookieJarFile('/repo', 'pagos', '_none')).toThrow();
    });

    it('refuses a workspace that is not an id segment', () => {
        expect(() => cookieJarFile('/repo', '../pagos', null)).toThrow();
    });
});
