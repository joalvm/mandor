import { describe, expect, it } from 'vitest';

import { picksOf, type ImportChoice } from '../../src/import/lib/import-choice.js';

function choice(input: ImportChoice['input']): ImportChoice {
    return { label: input, hint: '', input };
}

describe('picksOf', () => {
    it('lists each way once, files before folder, whatever the order of the formats', () => {
        expect(picksOf([choice('folder'), choice('files'), choice('folder')])).toEqual([
            'files',
            'folder',
        ]);
    });

    it('lists only the ways the formats ask for', () => {
        expect(picksOf([choice('folder')])).toEqual(['folder']);
        expect(picksOf([])).toEqual([]);
    });
});
