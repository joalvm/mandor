import { describe, expect, it } from 'vitest';

import {
    scriptPartsOf,
    scriptsOfBru,
    scriptsOfOpenCollection,
} from '../../../src/bruno/document/read-bru-scripts.js';

describe('scriptsOfOpenCollection', () => {
    it('puts each kind in its moment, the tests after the script of the response', () => {
        expect(
            scriptsOfOpenCollection([
                { type: 'before-request', code: 'a()' },
                { type: 'after-response', code: 'b()' },
                { type: 'tests', code: 'test(1)' },
            ]),
        ).toEqual({
            onBeforeRequest: { source: 'a()' },
            onResponse: { source: 'b()\n\ntest(1)' },
        });
    });

    it('gives nothing for no scripts, blank ones, or a kind Mandor has no moment for', () => {
        expect(scriptsOfOpenCollection(undefined)).toBeUndefined();
        expect(scriptsOfOpenCollection(null)).toBeUndefined();
        expect(
            scriptsOfOpenCollection([
                { type: 'before-request', code: ' ' },
                { type: 'hooks', code: 'x()' },
            ]),
        ).toBeUndefined();
    });
});

describe('scriptsOfBru', () => {
    it('reads the script blocks and the tests of a .bru file into their moments', () => {
        expect(scriptsOfBru({ req: 'a()', res: '' }, 'test(1)')).toEqual({
            onBeforeRequest: { source: 'a()' },
            onResponse: { source: 'test(1)' },
        });
        expect(scriptsOfBru(undefined, undefined)).toBeUndefined();
    });
});

describe('scriptPartsOf', () => {
    it('reads the kinds with a moment and names only the written ones without', () => {
        const hooks = { type: 'hooks', code: 'x()' };

        expect(
            scriptPartsOf([
                { type: 'tests', code: 't()' },
                hooks,
                { type: 'grpc', code: '' },
                { type: 'grpc' },
            ]),
        ).toEqual({ read: { onResponse: { source: 't()' } }, unread: [hooks] });
        expect(scriptPartsOf(undefined)).toEqual({ read: undefined, unread: [] });
    });
});
