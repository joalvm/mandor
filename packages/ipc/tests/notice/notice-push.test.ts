import { describe, expect, it } from 'vitest';

import {
    noticeCodeSchema,
    noticeListResultSchema,
    noticePushSchema,
} from '../../src/notice/notice-push.js';

describe('the push of a notice', () => {
    it('carries a code, a tone and the values the translation fills in', () => {
        const push = {
            id: 3,
            code: 'files-unreadable',
            tone: 'warning',
            key: 'files-unreadable',
            params: { count: 2, names: ['a', 'b'], area: 'collections' },
        };

        expect(noticePushSchema.parse(push)).toEqual(push);
    });

    it('needs nothing beyond the identity, the code and the tone', () => {
        const push = { id: 1, code: 'files-unreadable', tone: 'error' };

        expect(noticePushSchema.parse(push)).toEqual(push);
    });

    it('refuses a code main has no translation for', () => {
        const push = { id: 1, code: 'something-else', tone: 'error' };

        expect(noticeCodeSchema.safeParse('something-else').success).toBe(false);
        expect(noticePushSchema.safeParse(push).success).toBe(false);
    });

    it('refuses loose text: main sends a code and never a sentence', () => {
        const push = { id: 1, code: 'files-unreadable', tone: 'error', title: 'No se pudo' };

        expect(noticePushSchema.safeParse(push).success).toBe(false);
    });

    it.each([
        { id: 0 },
        { id: 1.5 },
        { tone: 'success' },
        { key: '' },
        { params: { nested: { deep: 1 } } },
    ])('refuses a malformed notice: %j', (broken) => {
        const push = { id: 1, code: 'files-unreadable', tone: 'error', ...broken };

        expect(noticePushSchema.safeParse(push).success).toBe(false);
    });

    it('answers the list as a result of notices', () => {
        const value = [{ id: 1, code: 'files-unreadable', tone: 'warning' }];

        expect(noticeListResultSchema.parse({ ok: true, value })).toEqual({ ok: true, value });
    });
});
