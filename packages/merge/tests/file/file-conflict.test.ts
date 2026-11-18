import { describe, expect, it } from 'vitest';

import { NO_DECISION } from '../../src/choice/settle-conflict.js';
import { askAboutFile } from '../../src/file/file-conflict.js';

describe('asking about a whole file', () => {
    it('keeps the file of ours and carries the three texts', () => {
        const asked = askAboutFile({ base: 'b', ours: 'o', theirs: 't' }, NO_DECISION);

        expect(asked).toEqual({
            text: 'o',
            conflicts: [
                {
                    id: '',
                    path: [],
                    shape: 'file',
                    base: { value: 'b' },
                    ours: { value: 'o' },
                    theirs: { value: 't' },
                },
            ],
        });
    });

    it('says «not there» for a side that does not have the file, and keeps ours deleted', () => {
        const asked = askAboutFile({ base: null, ours: null, theirs: 't' }, NO_DECISION);

        expect(asked.text).toBeNull();
        expect(asked.conflicts[0]).toMatchObject({ base: null, ours: null });
    });

    it('answers with the file of the side picked, deletion included', () => {
        const sides = { base: 'b', ours: 'o', theirs: null };

        expect(askAboutFile(sides, () => ({ pick: 'theirs' }))).toEqual({
            text: null,
            conflicts: [],
        });
        expect(askAboutFile(sides, () => ({ pick: 'ours' }))).toEqual({
            text: 'o',
            conflicts: [],
        });
    });

    it('answers with the text the user wrote', () => {
        const sides = { base: 'b', ours: 'o', theirs: 't' };

        expect(askAboutFile(sides, () => ({ text: 'x: 1\n' }))).toEqual({
            text: 'x: 1\n',
            conflicts: [],
        });
    });
});
