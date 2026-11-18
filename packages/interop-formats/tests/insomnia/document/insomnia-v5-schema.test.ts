import { describe, expect, it } from 'vitest';

import {
    insomniaV5NodeSchema,
    insomniaV5Schema,
} from '../../../src/insomnia/document/insomnia-v5-schema.js';

describe('insomniaV5Schema', () => {
    it('takes a collection that holds what Insomnia wrote, with nulls where it meant nothing', () => {
        const parsed = insomniaV5Schema.safeParse({
            type: 'collection.insomnia.rest/5.0',
            name: null,
            meta: { id: 'wrk_1', description: null },
            collection: null,
            environments: { name: 'Base', data: { a: 1 }, subEnvironments: null },
        });

        expect(parsed.success).toBe(true);
    });

    it('lets a key nobody reads ride along', () => {
        const parsed = insomniaV5Schema.safeParse({
            type: 'collection.insomnia.rest/5.0',
            schema_version: '5.1',
            cookieJar: {},
        });

        expect(parsed.success && parsed.data).toMatchObject({ schema_version: '5.1' });
    });

    it('refuses another type of file', () => {
        expect(insomniaV5Schema.safeParse({ type: 'spec.insomnia.rest/5.0' }).success).toBe(false);
    });

    it('refuses a collection that is not a list', () => {
        const parsed = insomniaV5Schema.safeParse({
            type: 'collection.insomnia.rest/5.0',
            collection: {},
        });

        expect(parsed.success).toBe(false);
    });
});

describe('insomniaV5NodeSchema', () => {
    it('takes a folder by its children and a request by its method', () => {
        expect(insomniaV5NodeSchema.safeParse({ name: 'F', children: [{}] }).success).toBe(true);
        expect(insomniaV5NodeSchema.safeParse({ name: 'R', method: 'GET' }).success).toBe(true);
    });

    it('refuses children that are not a list', () => {
        expect(insomniaV5NodeSchema.safeParse({ children: 'x' }).success).toBe(false);
    });
});
