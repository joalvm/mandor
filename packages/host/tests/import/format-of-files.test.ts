import type { InteropFormat } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { formatOfFiles } from '../../src/import/format-of-files.js';
import { fixtureFormat } from '../interop/fixture-format.js';

function claiming(id: string, word: string): InteropFormat {
    return {
        ...fixtureFormat,
        id,
        sniff: (files) => files.some(({ text }) => text.includes(word)),
    };
}

function file(text: string) {
    return [{ path: 'a.json', text }];
}

describe('the format of some files', () => {
    it('is the first one of the list that recognizes them', () => {
        const formats = [
            claiming('uno', 'alfa'),
            claiming('dos', 'beta'),
            claiming('tres', 'beta'),
        ];
        const found = formatOfFiles(formats, file('beta'));

        expect(found.ok ? found.value.id : '').toBe('dos');
    });

    it('is refused with the code of an unknown format when none recognizes them', () => {
        const found = formatOfFiles(
            [claiming('uno', 'alfa'), claiming('dos', 'beta')],
            file('gamma'),
        );

        expect(found.ok ? '' : found.error.code).toBe('import-format-unknown');
        expect(found.ok ? '' : found.error.message).toContain('uno, dos');
    });
});
