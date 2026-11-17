import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { leftOutText } from '../../../src/bruno/import/left-out-text.js';

describe('leftOutText', () => {
    it('says nothing when nothing was left out', () => {
        expect(leftOutText('request', [])).toEqual([]);
    });

    it('names what a level kept, in one sentence', () => {
        expect(leftOutText('folder', ['scripts', 'tags'])).toEqual([
            degradation('noPlaceFolder', { names: 'scripts, tags' }),
        ]);
        expect(leftOutText('collection', ['scripts'])).toEqual([
            degradation('noPlaceCollection', { names: 'scripts' }),
        ]);
    });
});
