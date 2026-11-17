import { createRequestItem, type RequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    applyScriptEffects,
    noEffects,
    wroteAny,
} from '../../../../src/main/request/apply-script-effects.js';

function line(key: string, value: string, enabled = true) {
    return { key, value, enabled };
}

const REQUEST: RequestItem = {
    ...createRequestItem({ name: 'List' }),
    url: '{{baseUrl}}/orders',
    headers: [line('X-Trace', 'a'), line('X-Off', 'x', false), line('Accept', 'text/plain')],
    query: [line('page', '1'), line('Page', 'kept')],
    body: { type: 'json', content: '{}' },
};

describe('applyScriptEffects', () => {
    it('replaces the line of the request with that name, in any case, and keeps its spelling', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'x-trace', op: 'set', value: 'b' },
        ]);

        expect(applied.request.headers).toEqual([
            line('X-Off', 'x', false),
            line('Accept', 'text/plain'),
            line('X-Trace', 'b'),
        ]);
        expect(applied.droppedHeaders.size).toBe(0);
    });

    it('knows the line it wrote by the object, not by where it sits', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'x-new', op: 'set', value: '1' },
            { kind: 'header', name: 'accept', op: 'delete' },
        ]);
        const written = applied.request.headers.find(({ key }) => key === 'x-new');

        expect(written).toBeDefined();
        expect(applied.written.lines.has(written ?? line('', ''))).toBe(true);
        expect(applied.written.lines.size).toBe(1);
    });

    it('takes a deleted header out of the request and out of what it inherits, until set again', () => {
        const deleted = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'X-Inherited', op: 'delete' },
            { kind: 'header', name: 'accept', op: 'delete' },
        ]);
        const setAgain = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'x-inherited', op: 'delete' },
            { kind: 'header', name: 'x-inherited', op: 'set', value: 'mine' },
        ]);

        expect([...deleted.droppedHeaders]).toEqual(['x-inherited', 'accept']);
        expect(deleted.request.headers.map(({ key }) => key)).toEqual(['X-Trace', 'X-Off']);
        expect(setAgain.droppedHeaders.size).toBe(0);
        expect(setAgain.request.headers.at(-1)).toEqual(line('x-inherited', 'mine'));
    });

    it('matches query lines as written, and sets or deletes only those', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'query', name: 'page', op: 'set', value: '2' },
            { kind: 'query', name: 'Page', op: 'delete' },
            { kind: 'query', name: 'sort', op: 'set', value: 'asc' },
        ]);

        expect(applied.request.query).toEqual([line('page', '2'), line('sort', 'asc')]);
        expect(applied.written.lines.size).toBe(2);
    });

    it('writes the url, the method and a body of text, and names each field', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'url', value: 'https://other.test/x' },
            { kind: 'method', value: 'PUT' },
            { kind: 'body', type: 'text', value: 'hello' },
        ]);

        expect(applied.request).toMatchObject({
            url: 'https://other.test/x',
            method: 'PUT',
            body: { type: 'text', content: 'hello' },
        });
        expect([...applied.written.fields]).toEqual(['url', 'method', 'body']);
    });

    it('turns no body into the text a script writes', () => {
        const applied = applyScriptEffects({ ...REQUEST, body: { type: 'none' } }, [
            { kind: 'body', type: 'text', value: 'now' },
        ]);

        expect(applied.request.body).toEqual({ type: 'text', content: 'now' });
    });

    it('never writes a body that is not text, even when the worker asks, and says so', () => {
        const form = { ...REQUEST, body: { type: 'form' as const, fields: [] } };
        const applied = applyScriptEffects(form, [{ kind: 'body', type: 'json', value: '{}' }]);

        expect(applied.request.body).toEqual(form.body);
        expect(applied.written.fields.size).toBe(0);
        expect(applied.logs).toEqual([
            {
                level: 'warn',
                notice: 'body-not-writable',
                params: { type: 'form' },
            },
        ]);
    });

    it('tells a script that set or deleted Host, in any case', () => {
        const set = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'HOST', op: 'set', value: 'evil.test' },
        ]);
        const deleted = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'host', op: 'delete' },
        ]);

        expect(set.wroteHost).toBe(true);
        expect(deleted.wroteHost).toBe(true);
        expect(applyScriptEffects(REQUEST, []).wroteHost).toBe(false);
    });

    it('leaves the request alone for what is not its business, and says nothing was written', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'var', name: 'a', value: '1' },
            { kind: 'socket', value: 'frame' },
        ]);

        expect(applied.request).toBe(REQUEST);
        expect(wroteAny(applied)).toBe(false);
        expect(wroteAny(noEffects(REQUEST))).toBe(false);
        expect(wroteAny(applyScriptEffects(REQUEST, [{ kind: 'method', value: 'GET' }]))).toBe(
            true,
        );
        expect(
            wroteAny(applyScriptEffects(REQUEST, [{ kind: 'header', name: 'a', op: 'delete' }])),
        ).toBe(true);
    });
});
