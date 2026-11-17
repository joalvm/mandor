import type { InteropFormat } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { openFiltersOf, saveFiltersOf } from '../../src/interop/format-filters.js';
import { fixtureFormat } from './fixture-format.js';

const other: InteropFormat = {
    ...fixtureFormat,
    id: 'other',
    label: 'Other',
    reads: ['yaml', 'yml'],
    writes: ['yaml'],
};

describe('the files a dialog offers for the formats the app lists', () => {
    it('opens every file any listed format reads, each under the name of its format', () => {
        expect(openFiltersOf([fixtureFormat, other])).toEqual([
            { name: 'Fixture', extensions: ['json'] },
            { name: 'Other', extensions: ['yaml', 'yml'] },
        ]);
    });

    it('saves under the format that writes the extension of the suggested name', () => {
        expect(saveFiltersOf([fixtureFormat, other], 'pasarela.yaml')).toEqual([
            { name: 'Other', extensions: ['yaml'] },
        ]);
    });

    it('offers every format it writes when the suggested name names none of them', () => {
        expect(saveFiltersOf([fixtureFormat, other], 'pasarela')).toEqual([
            { name: 'Fixture', extensions: ['json'] },
            { name: 'Other', extensions: ['yaml'] },
        ]);
    });

    it('offers nothing to open and nothing to save when the app lists no format', () => {
        expect(openFiltersOf([])).toEqual([]);
        expect(saveFiltersOf([], 'pasarela.yaml')).toEqual([]);
    });
});
