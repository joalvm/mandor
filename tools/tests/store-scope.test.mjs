import { describe, expect, it } from 'vitest';

import { sourceFiles } from '../design/source-files.mjs';
import { storeScopeProblems } from '../guards/store-scope.mjs';

const PATH = 'packages/collections/src/sample-store.ts';

function check(text, path = PATH) {
    return storeScopeProblems([{ path, text }]);
}

describe('the scope of a store', () => {
    it('is said by every store of the product', async () => {
        expect(storeScopeProblems(await sourceFiles())).toEqual([]);
    });

    it('is caught when a store says nothing', () => {
        const text = 'export const sample = createStore<Sample>()((set) => ({}));';

        expect(check(text)[0]).toMatch('says nothing of what it lives for');
    });

    it('passes when the origin lets it go', () => {
        const text = 'export const sample = scopeToOrigin(createStore<Sample>()((set) => ({})));';

        expect(check(text)).toEqual([]);
    });

    it('passes when the factory is wrapped where the singleton is made', () => {
        const text = [
            'export function createSample() {',
            '    return createStore<Sample>()((set) => ({}));',
            '}',
            'export const sample = scopeToOrigin(createSample());',
        ].join('\n');

        expect(check(text)).toEqual([]);
    });

    it('passes when it lives as long as the window and says why', () => {
        const text = [
            '// store-scope: window — the session is read again by loadSession.',
            'const sample = createStore<Sample>(() => ({ query: "" }));',
        ].join('\n');

        expect(check(text)).toEqual([]);
    });

    it('is caught when the window scope gives no reason', () => {
        const text = '// store-scope: window —\nconst sample = createStore<Sample>(() => ({}));';

        expect(check(text)).toHaveLength(1);
    });

    it('is caught when one of two stores of a file says nothing', () => {
        const text = [
            'const first = scopeToOrigin(createStore<A>(() => ({})));',
            'const second = createStore<B>(() => ({}));',
        ].join('\n');

        expect(check(text)).toHaveLength(1);
    });

    it('ignores the doubles of the tests and what is not source', () => {
        const text = 'const sample = createStore<Sample>(() => ({}));';

        expect(check(text, 'packages/shell/src/testing/sample.ts')).toEqual([]);
        expect(check(text, 'packages/shell/tests/sample.test.ts')).toEqual([]);
    });
});
