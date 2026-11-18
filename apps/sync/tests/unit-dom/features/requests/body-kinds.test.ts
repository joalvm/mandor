import { REQUEST_BODY_TYPES, type RequestBody } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    bodyAfterKindChange,
    BEAUTIFIES,
    BODY_TYPE_GROUPS,
    LANGUAGE_OF_BODY,
} from '../../../../src/renderer/features/requests/components/body/body-kinds.js';

describe('the kinds a body of a request starts as', () => {
    it('starts every kind empty, whole and ready to write', () => {
        const none = { type: 'none' } as const;

        expect(bodyAfterKindChange(none, 'none')).toEqual({ type: 'none' });
        expect(bodyAfterKindChange(none, 'json')).toEqual({ content: '', type: 'json' });
        expect(bodyAfterKindChange(none, 'binary')).toEqual({ file: '', type: 'binary' });
        expect(bodyAfterKindChange(none, 'graphql')).toEqual({
            query: '',
            type: 'graphql',
            variables: '',
        });
        expect(bodyAfterKindChange(none, 'urlencoded')).toEqual({ fields: [], type: 'urlencoded' });
    });

    /** The text is the same whichever way it is read: switching how to read it must not lose it. */
    it('keeps the text written when the kind changes among the text kinds', () => {
        const written = { content: '{ "a": 1 }', type: 'json' } as const;

        expect(bodyAfterKindChange(written, 'text')).toEqual({
            content: '{ "a": 1 }',
            type: 'text',
        });
        expect(bodyAfterKindChange(written, 'xml')).toEqual({ content: '{ "a": 1 }', type: 'xml' });
        expect(bodyAfterKindChange({ content: '<a/>', type: 'xml' }, 'json')).toEqual({
            content: '<a/>',
            type: 'json',
        });
    });

    it('starts the new kind empty when the change leaves or enters the text kinds', () => {
        const written = { content: 'hello', type: 'text' } as const;
        const form: RequestBody = {
            fields: [{ enabled: true, key: 'a', kind: 'text', value: 'b' }],
            type: 'form',
        };

        expect(bodyAfterKindChange(written, 'form')).toEqual({ fields: [], type: 'form' });
        expect(bodyAfterKindChange(written, 'none')).toEqual({ type: 'none' });
        expect(bodyAfterKindChange(form, 'text')).toEqual({ content: '', type: 'text' });
        expect(bodyAfterKindChange({ file: 'a.png', type: 'binary' }, 'json')).toEqual({
            content: '',
            type: 'json',
        });
    });

    it('speaks the editor of each text body', () => {
        expect(LANGUAGE_OF_BODY.json).toBe('jsonc');
        expect(LANGUAGE_OF_BODY.text).toBe('plaintext');
        expect(LANGUAGE_OF_BODY.xml).toBe('xml');
    });

    it('groups every kind in exactly one family of the picker', () => {
        const grouped = BODY_TYPE_GROUPS.flatMap((group) => [...group.types]);

        expect([...grouped].sort()).toEqual([...REQUEST_BODY_TYPES].sort());
    });

    it('lays out only the text the editor knows how to lay out', () => {
        expect(REQUEST_BODY_TYPES.filter((type) => BEAUTIFIES[type])).toEqual(['json']);
    });
});
