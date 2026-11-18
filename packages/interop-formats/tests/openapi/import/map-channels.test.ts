import { describe, expect, it } from 'vitest';

import { channelsOf } from '../../../src/openapi/import/map-channels.js';

describe('the channels of an OpenAPI document', () => {
    it('makes one per path, with what the path item says about itself', () => {
        const channels = channelsOf({
            paths: {
                '/orders': {
                    description: 'Orders collection',
                    summary: 'Orders',
                    'x-team': 'shop',
                    parameters: [],
                    get: { responses: {} },
                },
                '/files': { post: { responses: {} } },
            },
        });

        expect(channels).toEqual([
            {
                name: '/orders',
                address: '/orders',
                description: 'Orders collection',
                extras: { summary: 'Orders', 'x-team': 'shop' },
            },
            { name: '/files', address: '/files', description: undefined, extras: {} },
        ]);
    });
});
