import { describe, expect, it } from 'vitest';

import { isOriginUrl, OriginUrlError, splitOriginUrl } from '../../src/index.js';

describe('splitOriginUrl', () => {
    it('accepts an https url and names its host', () => {
        expect(splitOriginUrl('https://github.com/equipo/api.git')).toEqual({
            url: 'https://github.com/equipo/api.git',
            host: 'github',
        });
    });

    it('accepts an ssh url without treating its user as a secret', () => {
        expect(splitOriginUrl('ssh://git@gitlab.com/equipo/api.git')).toEqual({
            url: 'ssh://gitlab.com/equipo/api.git',
            host: 'gitlab',
        });
    });

    it('accepts the scp form, which is not a URL', () => {
        expect(splitOriginUrl('git@bitbucket.org:equipo/api.git')).toEqual({
            url: 'git@bitbucket.org:equipo/api.git',
            host: 'bitbucket',
        });
    });

    it('answers with the generic host for a server it does not know', () => {
        expect(splitOriginUrl('https://git.example.com/equipo/api.git')).toEqual({
            url: 'https://git.example.com/equipo/api.git',
            host: 'generic',
        });
    });

    /** The token goes to the system store; what stays on disk is the URL without it. */
    it('separates the credentials an https url carries', () => {
        expect(splitOriginUrl('https://ci:tok3n@github.com/equipo/api.git')).toEqual({
            url: 'https://github.com/equipo/api.git',
            host: 'github',
            token: 'tok3n',
        });
    });

    it('decodes the escapes of the token, as git reads them', () => {
        expect(splitOriginUrl('https://ci:a%2Fb@github.com/equipo/api.git').token).toBe('a/b');
    });

    /** A `%` that starts no escape is one more character of the token, not a broken url. */
    it('keeps a token whose percent sign starts no escape as it was written', () => {
        expect(splitOriginUrl('https://ci:50%zz@github.com/equipo/api.git')).toEqual({
            url: 'https://github.com/equipo/api.git',
            host: 'github',
            token: '50%zz',
        });
    });

    it('keeps a run of escapes that is no text as it was written', () => {
        expect(splitOriginUrl('https://ci:%E0%A4%2F@github.com/equipo/api.git').token).toBe(
            '%E0%A4%2F',
        );
    });

    it('refuses a scheme that cannot name an origin', () => {
        expect(() => splitOriginUrl('http://github.com/equipo/api.git')).toThrow(OriginUrlError);
    });

    it('accepts a file url, which is how a bare repo on a mounted share names itself', () => {
        expect(splitOriginUrl('file:///srv/mirrors/api.git')).toEqual({
            url: 'file:///srv/mirrors/api.git',
            host: 'generic',
        });
    });

    /** `-oProxyCommand=…@host:repo` is the scp form to the eye and an option to ssh. */
    it('refuses an scp form whose user or host reads as an option', () => {
        expect(() => splitOriginUrl('-oProxyCommand=calc@github.com:equipo/api.git')).toThrow(
            OriginUrlError,
        );
        expect(() => splitOriginUrl('git@-oProxyCommand=calc:equipo/api.git')).toThrow(
            OriginUrlError,
        );
        expect(isOriginUrl('-oProxyCommand=calc@github.com:equipo/api.git')).toBe(false);
    });

    /** `ssh://-oProxyCommand=…/repo` is a URL to the runtime and an option to ssh. */
    it('refuses an ssh url whose user or host reads as an option', () => {
        expect(() => splitOriginUrl('ssh://-oProxyCommand=calc/equipo/api.git')).toThrow(
            OriginUrlError,
        );
        expect(() => splitOriginUrl('ssh://-oProxyCommand=calc@github.com/equipo/api.git')).toThrow(
            OriginUrlError,
        );
        expect(isOriginUrl('ssh://-oProxyCommand=calc/equipo/api.git')).toBe(false);
        expect(isOriginUrl('ssh://-oProxyCommand=calc@github.com/equipo/api.git')).toBe(false);
    });

    it('refuses a string that is no url at all', () => {
        expect(() => splitOriginUrl('equipo/api')).toThrow(OriginUrlError);
    });
});
