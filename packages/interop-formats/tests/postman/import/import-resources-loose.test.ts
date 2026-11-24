import type {
    InteropDocument,
    InteropHttpOperation,
    InteropOperation,
    InteropParameter,
} from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { importResourcesOf } from '../../../src/postman/import/import-resources.js';

const EMPTY: InteropDocument = {
    name: 'Loose',
    sourceId: 'collection:l',
    servers: [],
    channels: [],
    operations: [],
    defaultSecurity: [],
    security: {},
    payloadSchemas: {},
    extras: {},
    notes: [],
};

function operation(http: Partial<InteropHttpOperation>): InteropOperation {
    return {
        name: 'Ping',
        channel: 'Ping',
        direction: 'outgoing',
        security: [],
        extras: {},
        http: {
            method: 'GET',
            path: '',
            url: 'http://x.test',
            tags: [],
            security: null,
            parameters: [],
            responses: [],
            ...http,
        },
    };
}

describe('request-resource and folder-resources: what a document may leave out', () => {
    it('sits a request with no group at the root', () => {
        const resources = importResourcesOf({ ...EMPTY, operations: [operation({})] });

        expect(resources.map((each) => each.route)).toEqual(['loose', 'loose/ping']);
    });

    it('lets a parameter with no switch be on when it is required, and off when it is not', () => {
        const parameters: InteropParameter[] = [
            { name: 'a', in: 'query', required: true, value: '1' },
            { name: 'b', in: 'query', required: false, value: '2' },
        ];
        const resource = importResourcesOf({
            ...EMPTY,
            operations: [operation({ parameters })],
        }).find((each) => each.place === 'item');

        expect(resource?.fields['query']).toEqual([
            { key: 'a', value: '1', enabled: true },
            { key: 'b', value: '2', enabled: false },
        ]);
    });

    /** A request with no url in the file still imports, with the address left to fill. */
    it('writes a request with no address and no url on disk', () => {
        const resource = importResourcesOf({
            ...EMPTY,
            operations: [operation({ url: undefined })],
        }).find((each) => each.place === 'item');

        expect(resource?.fields).toMatchObject({ method: 'GET' });
        expect(resource?.fields).not.toHaveProperty('url');
    });

    it('gives a folder with no name the plain word of its kind', () => {
        const folder = importResourcesOf({
            ...EMPTY,
            groups: [{ path: [], security: null, scripts: [], extras: {} }],
        }).find((each) => each.place === 'folder');

        expect(folder?.route).toBe('loose/folder');
    });
});
