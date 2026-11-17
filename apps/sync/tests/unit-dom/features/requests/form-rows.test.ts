import type { RequestFormField } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    formFieldsOf,
    formRowsOf,
} from '../../../../src/renderer/features/requests/lib/form-rows.js';

const FIELDS: RequestFormField[] = [
    { description: 'The picture', enabled: true, key: 'avatar', kind: 'file', value: 'a.png' },
    { enabled: false, key: 'name', kind: 'text', value: 'Ada' },
];

describe('the fields of a form body, as the editor draws them and as the disk keeps them', () => {
    it('one identity per position, with the kind of value each one carries', () => {
        expect(formRowsOf(FIELDS)).toEqual([
            { disabled: false, id: '0', kind: 'file', name: 'avatar', value: 'a.png' },
            { disabled: true, id: '1', kind: 'text', name: 'name', value: 'Ada' },
        ]);
    });

    it('a round trip gives back the fields, words included', () => {
        expect(formFieldsOf(formRowsOf(FIELDS), FIELDS)).toEqual(FIELDS);
    });

    it('a row with no field behind it is born with only what the editor drew', () => {
        expect(
            formFieldsOf(
                [{ disabled: false, id: '7', kind: 'text', name: 'x', value: '' }],
                FIELDS,
            ),
        ).toEqual([{ enabled: true, key: 'x', kind: 'text', value: '' }]);
    });
});
