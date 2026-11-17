import { describe, expect, it } from 'vitest';

import { formatResourceUri } from '../../src/index.js';
import { ResourceUriError } from '../../src/resource/resource-uri-error.js';

describe('formatResourceUri', () => {
    it('names a workspace resource by repo, workspace, kind and path', () => {
        expect(
            formatResourceUri({
                scope: 'workspace',
                repo: 'mi-repo',
                workspace: 'mi-ws',
                kind: 'doc',
                path: 'guias/inicio.md',
            }),
        ).toBe('mandor://mi-repo/mi-ws/doc/guias/inicio.md');
    });

    it('names an environment as a workspace resource', () => {
        expect(
            formatResourceUri({
                scope: 'workspace',
                repo: 'mi-repo',
                workspace: 'mi-ws',
                kind: 'environment',
                path: 'local',
            }),
        ).toBe('mandor://mi-repo/mi-ws/environment/local');
    });

    /** Disk uses a backslash on Windows and the URI never does, or the same file gets two names. */
    it('writes a Windows path with forward slashes', () => {
        expect(
            formatResourceUri({
                scope: 'workspace',
                repo: 'mi-repo',
                workspace: 'mi-ws',
                kind: 'doc',
                path: 'guias\\inicio.md',
            }),
        ).toBe('mandor://mi-repo/mi-ws/doc/guias/inicio.md');
    });

    it('escapes a path segment that carries a space', () => {
        expect(
            formatResourceUri({
                scope: 'workspace',
                repo: 'mi-repo',
                workspace: 'mi-ws',
                kind: 'doc',
                path: 'guia de inicio.md',
            }),
        ).toBe('mandor://mi-repo/mi-ws/doc/guia%20de%20inicio.md');
    });

    it('names the settings of a repo without a workspace', () => {
        expect(formatResourceUri({ scope: 'settings', repo: 'mi-repo' })).toBe(
            'mandor://mi-repo/settings',
        );
    });

    it('names a window resource under the reserved host', () => {
        expect(formatResourceUri({ scope: 'app', name: 'welcome' })).toBe('mandor://_app/welcome');
    });

    it.each([
        ['', 'repo'],
        ['Mi-Repo', 'repo'],
        ['mi repo', 'repo'],
        ['_app', 'repo'],
    ])('refuses "%s" as a repo', (repo) => {
        expect(() => formatResourceUri({ scope: 'settings', repo })).toThrow(
            expect.objectContaining({ name: 'ResourceUriError', reason: 'repo' }),
        );
    });

    it('refuses a workspace that is not one slug', () => {
        expect(() =>
            formatResourceUri({
                scope: 'workspace',
                repo: 'mi-repo',
                workspace: 'Mi WS',
                kind: 'doc',
                path: 'a.md',
            }),
        ).toThrow(expect.objectContaining({ reason: 'workspace' }));
    });

    it('refuses a kind outside the closed list', () => {
        expect(() =>
            formatResourceUri({
                scope: 'workspace',
                repo: 'mi-repo',
                workspace: 'mi-ws',
                // The border exists for callers that reach it without types.
                kind: 'invento' as 'doc',
                path: 'a.md',
            }),
        ).toThrow(expect.objectContaining({ reason: 'kind' }));
    });

    it.each(['', '..', '.', 'a/../b', 'a//b', 'a:b', 'sub/', 'a'.repeat(256)])(
        'refuses "%s" as a path',
        (path) => {
            expect(() =>
                formatResourceUri({
                    scope: 'workspace',
                    repo: 'mi-repo',
                    workspace: 'mi-ws',
                    kind: 'doc',
                    path,
                }),
            ).toThrow(ResourceUriError);
        },
    );

    it('refuses a window resource whose name is not one slug', () => {
        expect(() => formatResourceUri({ scope: 'app', name: 'Welcome Tab' })).toThrow(
            ResourceUriError,
        );
    });
});
