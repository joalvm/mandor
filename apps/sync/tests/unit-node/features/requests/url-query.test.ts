import { describe, expect, it } from 'vitest';

import {
    composeUrlOf,
    splitUrlOf,
} from '../../../../src/renderer/features/requests/lib/url-query.js';

function line(key: string, value: string, enabled = true) {
    return { enabled, key, value };
}

describe('the url a person reads and the query the request carries', () => {
    it('the pairs that go out hang from the url after its question mark', () => {
        expect(composeUrlOf('{{base}}/a', [line('x', '1'), line('y', '2')])).toBe(
            '{{base}}/a?x=1&y=2',
        );
    });

    it('a pair switched off does not reach the line, and one with no value keeps its name alone', () => {
        expect(composeUrlOf('{{base}}/a', [line('x', '1', false), line('page', '')])).toBe(
            '{{base}}/a?page',
        );
        expect(composeUrlOf('{{base}}/a', [])).toBe('{{base}}/a');
    });

    it('the line splits apart: the path back to the field, the pairs back to the table', () => {
        expect(splitUrlOf('{{base}}/a?x=1&page')).toEqual({
            query: [
                { enabled: true, key: 'x', value: '1' },
                { enabled: true, key: 'page', value: '' },
            ],
            url: '{{base}}/a',
        });
        expect(splitUrlOf('{{base}}/a')).toEqual({ query: [], url: '{{base}}/a' });
    });
});
