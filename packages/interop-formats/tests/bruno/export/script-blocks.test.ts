import { describe, expect, it } from 'vitest';

import { scriptBlocksOf } from '../../../src/bruno/export/script-blocks.js';

describe('scriptBlocksOf', () => {
    it('writes one block per moment, under the kind OpenCollection names it by, as it is', () => {
        expect(
            scriptBlocksOf({
                onBeforeRequest: { source: 'a();\nb();' },
                onResponse: { source: 'c()' },
            }),
        ).toEqual([
            { type: 'before-request', code: 'a();\nb();' },
            { type: 'after-response', code: 'c()' },
        ]);
    });

    it('writes nothing for no scripts, a blank one, or one switched off: Bruno would run it', () => {
        expect(scriptBlocksOf(undefined)).toEqual([]);
        expect(
            scriptBlocksOf({
                onBeforeRequest: { source: ' \n' },
                onResponse: { source: 'c()', enabled: false },
            }),
        ).toEqual([]);
    });
});
