import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { documentSourceId } from '../../../src/openapi/document/document-source-id.js';
import { documentToInterop } from '../../../src/openapi/import/document-to-interop.js';

import { fixtureText } from '../support/fixture-text.js';

describe('an OpenAPI document as the shared model', () => {
    it('names the service and gives it the identity of its title', async () => {
        const document = await documentToInterop(fixtureText('sample-3.1.yaml'));

        expect(document.name).toBe('Sample Shop');
        expect(document.sourceId).toBe(documentSourceId('Sample Shop'));
        expect(document.payloadSchemas).toEqual({});
    });

    it('offers each server, with the variables of its url', async () => {
        const { servers } = await documentToInterop(fixtureText('sample-3.1.yaml'));

        expect(servers.map((server) => [server.name, server.protocol])).toEqual([
            ['Shop', 'https'],
            ['/relative', 'http'],
        ]);
        expect(servers[0]?.variables).toMatchObject({
            env: { default: 'prod', enum: ['prod', 'staging'] },
        });
    });

    it('declares the security, and what it asks of everything that does not say otherwise', async () => {
        const document = await documentToInterop(fixtureText('sample-3.1.yaml'));

        expect(document.security).toEqual({
            basicAuth: { type: 'http', extras: { scheme: 'basic' } },
            apiKeyAuth: { type: 'apiKey', extras: { in: 'header', name: 'X-Api-Key' } },
        });
        expect(document.defaultSecurity).toEqual(['basicAuth']);
    });

    it('makes a channel per path and an operation per method', async () => {
        const document = await documentToInterop(fixtureText('sample-3.1.yaml'));

        expect(document.channels.map((channel) => channel.address)).toEqual([
            '/orders',
            '/orders/{orderId}',
            '/files',
        ]);
        expect(document.channels[0]?.description).toBe('Orders collection');
        expect(document.operations.map((operation) => operation.name)).toEqual([
            'List orders',
            'createOrder',
            'Get an order',
            'Upload a file',
        ]);
    });

    it('tells each request its parameters and what it expects back', async () => {
        const { operations } = await documentToInterop(fixtureText('sample-3.1.yaml'));
        const [list] = operations;

        expect(
            list?.http?.parameters.map((parameter) => [
                parameter.name,
                parameter.in,
                parameter.required,
                parameter.value,
            ]),
        ).toEqual([
            ['status', 'query', true, 'open'],
            ['page', 'query', false, '2'],
            ['session', 'cookie', false, 'abc'],
        ]);
        expect(list?.http?.responses).toHaveLength(1);
        expect(JSON.parse(list?.http?.responses[0]?.body ?? '')).toEqual([{ id: 1 }]);
    });

    it('tells each request its body, the sample made out of a schema that offers options', async () => {
        const { operations } = await documentToInterop(fixtureText('sample-3.1.yaml'));
        const body = operations[1]?.http?.requestBody;

        expect(body).toMatchObject({ contentType: 'application/json', required: true });
        expect(JSON.parse(body?.value ?? '')).toEqual({ id: 0, total: 0 });
    });

    it('keeps what the operation carries beyond the request, and a body of any type', async () => {
        const { operations } = await documentToInterop(fixtureText('sample-3.1.yaml'));

        expect(operations[1]?.extras).toEqual({ operationId: 'createOrder', deprecated: true });
        expect(operations[3]?.http?.requestBody?.contentType).toBe('application/octet-stream');
    });

    it('tells each request what it asks of the security: inherit, nothing, or its own', async () => {
        const { operations } = await documentToInterop(fixtureText('sample-3.1.yaml'));
        const [list, , get, upload] = operations;

        expect(list?.http?.security).toBeNull();
        expect(get?.http?.security).toEqual([]);
        expect(upload?.http?.security).toEqual(['apiKeyAuth']);
    });

    it('asks for a path parameter whatever the document says', async () => {
        const { operations } = await documentToInterop(fixtureText('sample-3.1.yaml'));

        expect(operations[2]?.http?.parameters[0]).toMatchObject({
            name: 'orderId',
            in: 'path',
            required: true,
        });
    });

    it('keeps the sections it does not import, and says so beside the circular schema it left', async () => {
        const document = await documentToInterop(fixtureText('sample-3.1.yaml'));

        expect(Object.keys(document.extras)).toEqual(['webhooks', 'x-internal']);
        expect(document.notes).toEqual([
            degradation('circularSchema', { name: 'Node' }),
            degradation('sectionKept', { key: 'webhooks' }),
            degradation('sectionKept', { key: 'x-internal' }),
        ]);
    });

    it('reads Swagger 2.0 like any other, and says it was converted', async () => {
        const document = await documentToInterop(fixtureText('petstore-2.0.json'));
        const add = document.operations.find((operation) => operation.name === 'Add a pet');

        expect(document.notes[0]).toEqual(degradation('convertedSwagger'));
        expect(document.servers[0]?.url).toBe('https://petstore.example.com/v1');
        expect(document.defaultSecurity).toEqual(['basicAuth']);
        expect(add?.http?.requestBody).toMatchObject({
            contentType: 'application/json',
            required: true,
        });
        expect(JSON.parse(add?.http?.requestBody?.value ?? '')).toMatchObject({
            id: 0,
            name: 'string',
        });
    });

    it('reads OpenAPI 3.0 like any other, and says it was converted', async () => {
        const document = await documentToInterop(fixtureText('petstore-3.0.json'));

        expect(document.notes).toEqual([degradation('convertedOpenapi30')]);
        expect(document.operations).toHaveLength(3);
    });

    it('says what the import leaves to the person: no server to point at, an auth it cannot hold', async () => {
        const text = [
            'openapi: 3.1.0',
            'info: { title: Bare, version: "1" }',
            'paths: {}',
            'components:',
            '  securitySchemes:',
            '    digest: { type: http, scheme: digest }',
        ].join('\n');
        const document = await documentToInterop(text);

        expect(document.notes).toEqual([
            degradation('securityHttpUnsupported', { name: 'digest', scheme: 'digest' }),
            degradation('noServer'),
        ]);
    });
});
