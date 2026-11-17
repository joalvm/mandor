import { describe, expect, it } from 'vitest';

import { originHostOf } from '../../src/index.js';
import { ORIGIN_HOSTS } from '../../src/origin/origin-host.js';

describe('originHostOf', () => {
    it('recognizes each known host by its hostname', () => {
        expect(originHostOf('https://github.com/equipo/api.git')).toBe('github');
        expect(originHostOf('https://gitlab.com/equipo/api.git')).toBe('gitlab');
        expect(originHostOf('https://bitbucket.org/equipo/api.git')).toBe('bitbucket');
        expect(originHostOf('https://dev.azure.com/equipo/api/_git/api')).toBe('azure-devops');
        expect(originHostOf('https://equipo.visualstudio.com/api/_git/api')).toBe('azure-devops');
    });

    it('recognizes the host of an ssh url', () => {
        expect(originHostOf('ssh://git@github.com/equipo/api.git')).toBe('github');
    });

    /** The scp form is not a URL, and the host is still the part between `@` and `:`. */
    it('recognizes the host of the scp form', () => {
        expect(originHostOf('git@gitlab.com:equipo/api.git')).toBe('gitlab');
    });

    it('answers generic for a host it does not know', () => {
        expect(originHostOf('https://git.example.com/equipo/api.git')).toBe('generic');
    });

    /** The local origin has no url, and no host either. */
    it('answers generic when there is no url at all', () => {
        expect(originHostOf(undefined)).toBe('generic');
        expect(originHostOf('not a url')).toBe('generic');
    });

    it('keeps the table closed', () => {
        expect(ORIGIN_HOSTS).toEqual(['github', 'gitlab', 'bitbucket', 'azure-devops', 'generic']);
    });
});
