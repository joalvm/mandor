import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { extrasDegradations } from '../../../src/har/import/extras-degradations.js';

describe('extrasDegradations', () => {
    it.each([
        [{ mergedEntries: 2 }, [degradation('harEntriesCombined', { count: '2' })]],
        [{ droppedExamples: 3 }, [degradation('harResponsesCapped', { max: '5', count: '3' })]],
        [
            { binaryExamples: ['200 OK', '404 Not Found'] },
            [
                degradation('harResponseBinary', { name: '200 OK' }),
                degradation('harResponseBinary', { name: '404 Not Found' }),
            ],
        ],
        [
            { binaryBody: 'application/pdf' },
            [degradation('harBodyBinary', { mime: 'application/pdf' })],
        ],
        [{}, []],
    ])('says %j', (extras, expected) => {
        expect(extrasDegradations(extras)).toEqual(expected);
    });

    it('says nothing of a key the importer does not write', () => {
        expect(extrasDegradations({ other: 1 })).toEqual([]);
    });
});
