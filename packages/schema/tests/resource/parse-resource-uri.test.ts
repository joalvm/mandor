import { describe, expect, it } from 'vitest';

import { formatResourceUri, parseResourceUri, type ResourceUriParts } from '../../src/index.js';
import { ResourceUriError } from '../../src/resource/resource-uri-error.js';

describe('parseResourceUri', () => {
    it('takes a workspace resource apart', () => {
        expect(parseResourceUri('mandor://mi-repo/mi-ws/doc/guias/inicio.md')).toEqual({
            scope: 'workspace',
            repo: 'mi-repo',
            workspace: 'mi-ws',
            kind: 'doc',
            path: 'guias/inicio.md',
        });
    });

    it('decodes an escaped path segment', () => {
        expect(parseResourceUri('mandor://mi-repo/mi-ws/doc/guia%20de%20inicio.md')).toEqual({
            scope: 'workspace',
            repo: 'mi-repo',
            workspace: 'mi-ws',
            kind: 'doc',
            path: 'guia de inicio.md',
        });
    });

    /** An id keeps the letters of any alphabet, and the host of a URL keeps them escaped. */
    it('takes apart a repo and a workspace named in any alphabet, and writes them back', () => {
        const workspace: ResourceUriParts = {
            scope: 'workspace',
            repo: '日本',
            workspace: 'привет',
            kind: 'doc',
            path: 'がっこう.md',
        };
        const settings: ResourceUriParts = { scope: 'settings', repo: '日本' };

        expect(parseResourceUri(formatResourceUri(workspace))).toEqual(workspace);
        expect(parseResourceUri(formatResourceUri(settings))).toEqual(settings);
        expect(parseResourceUri('mandor://日本/привет/doc/a.md')).toEqual({
            ...workspace,
            path: 'a.md',
        });
    });

    it('takes an item of the collection apart, folders and all', () => {
        expect(parseResourceUri('mandor://mi-repo/mi-ws/item/pedidos/pedido-creado')).toEqual({
            scope: 'workspace',
            repo: 'mi-repo',
            workspace: 'mi-ws',
            kind: 'item',
            path: 'pedidos/pedido-creado',
        });
    });

    it('takes the settings of a repo apart', () => {
        expect(parseResourceUri('mandor://mi-repo/settings')).toEqual({
            scope: 'settings',
            repo: 'mi-repo',
        });
    });

    it('takes a window resource apart', () => {
        expect(parseResourceUri('mandor://_app/welcome')).toEqual({
            scope: 'app',
            name: 'welcome',
        });
    });

    /**
     * The trap this file exists for. `URL` collapses `..` in silence, so a URI that walks out
     * of its workspace arrives already normalized and no search for '..' in the text sees it.
     * Counting the segments that survived is what catches it.
     */
    it('refuses a path that walked out of its workspace', () => {
        expect(() => parseResourceUri('mandor://r/w/doc/a/../../../fuera.md')).toThrow(
            ResourceUriError,
        );
    });

    it.each([
        ['https://example.com/x', 'scheme'],
        ['mandor:welcome', 'scheme'],
        ['mandor://[', 'scheme'],
        ['not a uri', 'scheme'],
    ])('refuses "%s" for its scheme', (uri, reason) => {
        expect(() => parseResourceUri(uri)).toThrow(expect.objectContaining({ reason }));
    });

    it.each([
        'mandor:///mi-ws/doc/a.md',
        'mandor://Mi-Repo/settings',
        'mandor://user:secret@mi-repo/settings',
    ])('refuses "%s" for its repo', (uri) => {
        expect(() => parseResourceUri(uri)).toThrow(expect.objectContaining({ reason: 'repo' }));
    });

    it('refuses a workspace that is not one slug', () => {
        expect(() => parseResourceUri('mandor://mi-repo/Mi%20WS/doc/a.md')).toThrow(
            expect.objectContaining({ reason: 'workspace' }),
        );
    });

    it('refuses a kind outside the closed list', () => {
        expect(() => parseResourceUri('mandor://mi-repo/mi-ws/invento/a.md')).toThrow(
            expect.objectContaining({ reason: 'kind' }),
        );
    });

    it.each([
        'mandor://mi-repo/mi-ws/doc',
        'mandor://mi-repo/mi-ws/doc/',
        'mandor://mi-repo/mi-ws/doc/a%ZZ.md',
        'mandor://mi-repo/mi-ws/doc/a%2Fb.md',
        'mandor://mi-repo/settings?seccion=git',
        'mandor://mi-repo/settings#git',
    ])('refuses "%s" for its path', (uri) => {
        expect(() => parseResourceUri(uri)).toThrow(expect.objectContaining({ reason: 'path' }));
    });

    it('refuses a window resource carrying more than a name', () => {
        expect(() => parseResourceUri('mandor://_app/welcome/extra')).toThrow(ResourceUriError);
    });

    it.each([
        'mandor://mi-repo/mi-ws/doc/guias/inicio.md',
        'mandor://mi-repo/mi-ws/doc/guia%20de%20inicio.md',
        'mandor://mi-repo/settings',
        'mandor://_app/welcome',
    ])('formats "%s" back to the same text', (uri) => {
        expect(formatResourceUri(parseResourceUri(uri))).toBe(uri);
    });
});

describe('the example of a request', () => {
    it('takes apart the path of the item and the key of the example', () => {
        expect(parseResourceUri('mandor://r/w/example/orders/list/Created')).toEqual({
            scope: 'workspace',
            repo: 'r',
            workspace: 'w',
            kind: 'example',
            path: 'orders/list/Created',
        });
    });
});

describe('the history of a workspace', () => {
    const FIRST = '7d9c1f0e-3b52-4a56-8d1b-6f2a9e4c7b10';
    const SECOND = '0b1e8c52-91d4-4c7a-9f3e-2d6a5b8c1e44';

    it('takes the list and a comparison apart', () => {
        expect(parseResourceUri('mandor://r/w/history/all')).toEqual({
            scope: 'workspace',
            repo: 'r',
            workspace: 'w',
            kind: 'history',
            path: 'all',
        });
        expect(parseResourceUri(`mandor://r/w/history/${FIRST}/${SECOND}`)).toEqual({
            scope: 'workspace',
            repo: 'r',
            workspace: 'w',
            kind: 'history',
            path: `${FIRST}/${SECOND}`,
        });
    });

    it('takes apart a request saved nowhere, named by its id', () => {
        expect(parseResourceUri(`mandor://r/w/loose/${FIRST}`)).toEqual({
            scope: 'workspace',
            repo: 'r',
            workspace: 'w',
            kind: 'loose',
            path: FIRST,
        });
    });

    it('writes the same text it reads', () => {
        const uri = `mandor://r/w/history/${FIRST}/${SECOND}`;

        expect(formatResourceUri(parseResourceUri(uri))).toBe(uri);
    });
});

describe('the clash of a workspace', () => {
    it('takes the id of a clash as the path of the resource and writes it back', () => {
        const uri = 'mandor://r/w/conflict/3fa94c01d27b8e65';

        expect(parseResourceUri(uri)).toEqual({
            scope: 'workspace',
            repo: 'r',
            workspace: 'w',
            kind: 'conflict',
            path: '3fa94c01d27b8e65',
        });
        expect(formatResourceUri(parseResourceUri(uri))).toBe(uri);
    });
});
