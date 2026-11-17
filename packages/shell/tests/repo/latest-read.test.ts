import { describe, expect, it } from 'vitest';

import { dropOriginState } from '../../src/origin/origin-scope.js';
import { createLatestRead } from '../../src/repo/latest-read.js';

describe('createLatestRead', () => {
    it('keeps only the read asked last as the one that may answer', () => {
        const ask = createLatestRead();
        const left = ask();
        const opened = ask();

        expect(left()).toBe(false);
        expect(opened()).toBe(true);
    });

    it('gives each gate turns of its own', () => {
        const environments = createLatestRead();
        const docs = createLatestRead();
        const read = environments();

        docs();

        expect(read()).toBe(true);
    });

    it('drops a read asked before the origin was left, and lets the next one answer', () => {
        const ask = createLatestRead();
        const read = ask();

        dropOriginState();

        expect(read()).toBe(false);
        expect(ask()()).toBe(true);
    });
});
