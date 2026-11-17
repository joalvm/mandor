import { describe, expect, it } from 'vitest';

import { insomniaV4Schema } from '../../../src/insomnia/document/insomnia-v4-schema.js';

const EXPORT = { _type: 'export', __export_format: 4 };

describe('insomniaV4Schema', () => {
    it('takes a resource that holds what Insomnia wrote, with nulls where it meant nothing', () => {
        const parsed = insomniaV4Schema.safeParse({
            ...EXPORT,
            resources: [
                {
                    _id: 'req_1',
                    _type: 'request',
                    parentId: null,
                    name: null,
                    body: { mimeType: null, params: [{ name: 'a', value: null, disabled: null }] },
                    headers: null,
                    authentication: { type: 'basic' },
                },
            ],
        });

        expect(parsed.success).toBe(true);
    });

    it('lets a key nobody reads ride along', () => {
        const parsed = insomniaV4Schema.safeParse({
            ...EXPORT,
            __export_date: '2026-01-01',
            resources: [{ _id: 'a', _type: 'cookie_jar', cookies: [] }],
        });

        expect(parsed.success && parsed.data.resources[0]).toMatchObject({ cookies: [] });
    });

    it.each([
        ['another export format', { ...EXPORT, __export_format: 3, resources: [] }],
        ['resources that are not a list', { ...EXPORT, resources: {} }],
        ['a resource with no id', { ...EXPORT, resources: [{ _type: 'request' }] }],
        [
            'a header that is not a list',
            { ...EXPORT, resources: [{ _id: 'a', _type: 'request', headers: 1 }] },
        ],
    ])('refuses %s', (_name, root) => {
        expect(insomniaV4Schema.safeParse(root).success).toBe(false);
    });
});
