import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { marksOf } from '../../../../src/renderer/features/requests/lib/section-marks.js';

function line(key: string, enabled: boolean) {
    return { enabled, key, value: '' };
}

describe('what the strip says about each section', () => {
    it('a dot when the lines that go out exist, whatever their count', () => {
        const request = {
            ...createRequestItem({ name: 'counted' }),
            headers: [line('a', true), line('b', false), line('c', true)],
            query: [line('q', true)],
        };

        expect(marksOf(request, 'headers')).toEqual({ filled: true });
        expect(marksOf(request, 'params')).toEqual({ filled: true });
        expect(marksOf({ ...createRequestItem({ name: 'bare' }) }, 'headers')).toEqual({
            filled: false,
        });
    });

    it('marks a body, an auth and a description only when they hold something', () => {
        const empty = createRequestItem({ name: 'empty' });
        const full = {
            ...empty,
            auth: { token: 't', type: 'bearer' as const },
            body: { content: '{}', type: 'json' as const },
            description: 'Creates an order',
        };

        expect(marksOf(empty, 'body')).toEqual({ filled: false });
        expect(marksOf(empty, 'auth')).toEqual({ filled: false });
        expect(marksOf(empty, 'doc')).toEqual({ filled: false });
        expect(marksOf(full, 'body')).toEqual({ filled: true });
        expect(marksOf(full, 'auth')).toEqual({ filled: true });
        expect(marksOf(full, 'doc')).toEqual({ filled: true });
        expect(marksOf({ ...full, auth: { inherit: true } }, 'auth')).toEqual({ filled: false });
    });

    it('scripts hold a dot only with scripts of their own', () => {
        const request = {
            ...createRequestItem({ name: 'rich' }),
            examples: [{ body: '{}', contentType: 'application/json', name: '', status: '200' }],
        };

        expect(marksOf(request, 'scripts')).toEqual({ filled: false });
        expect(marksOf(request, 'settings')).toEqual({});
        expect(marksOf(request, 'path')).toEqual({});
    });

    it('scripts hold a dot too with a script the person wrote, and not with an empty map', () => {
        const request = createRequestItem({ name: 'own' });

        expect(
            marksOf({ ...request, scripts: { onResponse: { source: 'a()' } } }, 'scripts'),
        ).toEqual({ filled: true });
        expect(marksOf({ ...request, scripts: {} }, 'scripts')).toEqual({ filled: false });
    });

    it('nothing about the file travels in a section: the draft is the tab of the request to say', () => {
        const before = createRequestItem({ name: 'pedido' });
        const draft = { ...before, query: [line('q', true)], description: 'nueva' };

        expect(marksOf(draft, 'params')).toEqual({ filled: true });
        expect(marksOf(before, 'params')).toEqual({ filled: false });
    });

    it('marks the schema green while the body keeps it, and broken once the body breaks it', () => {
        const written = {
            ...createRequestItem({ name: 'schema' }),
            bodySchema: '{"type":"object"}',
        };

        expect(marksOf(createRequestItem({ name: 'bare' }), 'schema')).toEqual({
            broken: false,
            filled: false,
        });
        expect(marksOf(written, 'schema')).toEqual({ broken: false, filled: true });
        expect(marksOf(written, 'schema', true)).toEqual({ broken: true, filled: false });
        expect(marksOf(written, 'headers', true)).toEqual({ filled: false });
    });
});
