import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { rootExtrasOf } from '../../../src/openapi/import/root-extras.js';

describe('what the root of the document carries beyond what is mapped', () => {
    it('keeps it and says so, one line for each key', () => {
        const { extras, notes } = rootExtrasOf({
            openapi: '3.1.0',
            info: {},
            paths: {},
            webhooks: { paid: {} },
            'x-internal': true,
        });

        expect(extras).toEqual({ webhooks: { paid: {} }, 'x-internal': true });
        expect(notes).toEqual([
            degradation('sectionKept', { key: 'webhooks' }),
            degradation('sectionKept', { key: 'x-internal' }),
        ]);
    });

    it('is quiet when everything was mapped', () => {
        const root = {
            openapi: '3.1.0',
            info: {},
            servers: [],
            paths: {},
            components: {},
            security: [],
            tags: [],
        };

        expect(rootExtrasOf(root)).toEqual({ extras: {}, notes: [] });
    });
});
