import { describe, expect, it } from 'vitest';

import { NO_DECISION } from '../../src/choice/settle-conflict.js';
import { askAboutValue } from '../../src/value/ask-about-value.js';

describe('asking about a value both sides moved', () => {
    it('keeps ours and raises the question while nobody decided', () => {
        const input = { base: 1, ours: 2, theirs: 3, path: ['n'], decide: NO_DECISION };
        const asked = askAboutValue(input);

        expect(asked.value).toBe(2);
        expect(asked.conflicts).toEqual([
            {
                id: 'n',
                path: ['n'],
                shape: 'value',
                base: { value: 1 },
                ours: { value: 2 },
                theirs: { value: 3 },
            },
        ]);
    });

    it('answers with the side the user picked', () => {
        const input = {
            base: 1,
            ours: 2,
            theirs: 3,
            path: ['n'],
            decide: () => ({ pick: 'theirs' as const }),
        };

        expect(askAboutValue(input)).toEqual({ value: 3, conflicts: [] });
    });
});
