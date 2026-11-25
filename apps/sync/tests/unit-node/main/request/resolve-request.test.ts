import { rm } from 'node:fs/promises';

import { writeGlobals } from '@mandor/store-fs';
import { UnsafeAuthorityError } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveRequest } from '../../../../src/main/request/resolve-request.js';
import {
    DIRECT_NETWORK,
    line,
    placeOf,
    repoWithEnvironment,
    sendInput,
} from './support/resolve-fixture.js';

let root: string;

beforeEach(async () => {
    root = await repoWithEnvironment();
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function place(secret: string | null = null) {
    return placeOf(root, secret);
}

const input = sendInput;

describe('resolving the request the window shows', () => {
    it('resolves url, query and headers against the environment, and upper-cases the method', async () => {
        const result = await resolveRequest(
            place(),
            input({
                method: 'post',
                url: '{{baseUrl}}/orders?sort=asc',
                query: [line('page', '{{page}}')],
                headers: [line('X-Page', '{{page}}')],
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({
            ok: true,
            value: {
                method: 'POST',
                url: 'http://api.test/orders?sort=asc&page=2',
                headers: [['X-Page', '2']],
            },
        });
    });

    it('leaves out the rows switched off and the ones with no name', async () => {
        const result = await resolveRequest(
            place(),
            input({
                url: 'http://api.test/',
                query: [line('off', '1', false), line('', 'x')],
                headers: [line('X-Off', '1', false)],
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({ ok: true, value: { url: 'http://api.test/', headers: [] } });
    });

    it('resolves a secret from the keychain', async () => {
        const result = await resolveRequest(
            place('s3cr3t-token'),
            input({
                url: 'http://api.test/',
                headers: [line('Authorization', 'Bearer {{token}}')],
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({
            ok: true,
            value: { headers: [['Authorization', 'Bearer s3cr3t-token']] },
        });
    });

    it('leaves a variable nobody defined as the text it was written', async () => {
        const result = await resolveRequest(place(), input({ url: '{{baseUrl}}/{{nowhere}}' }), {
            networkFor: DIRECT_NETWORK,
        });

        expect(result).toMatchObject({ ok: true });
        expect(JSON.stringify(result)).toContain('nowhere');
    });

    it('puts the path parameters in the path, after the variables resolve', async () => {
        const result = await resolveRequest(
            place(),
            input({
                url: '{{baseUrl}}/pets/{petId}?sort=asc',
                pathParams: [line('petId', 'a b'), line('off', '1', false)],
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({
            ok: true,
            value: { url: 'http://api.test/pets/a%20b?sort=asc' },
        });
    });

    it('refuses a path parameter with no value, or switched off', async () => {
        const url = '{{baseUrl}}/pets/{petId}';

        expect(
            await resolveRequest(place(), input({ url }), { networkFor: DIRECT_NETWORK }),
        ).toMatchObject({
            ok: false,
            error: { code: 'bad-request', message: 'the path parameter "petId" has no value' },
        });
        expect(
            await resolveRequest(place(), input({ url, pathParams: [line('petId', '7', false)] }), {
                networkFor: DIRECT_NETWORK,
            }),
        ).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('puts a variable nobody defined in a path row as the text it was written', async () => {
        const result = await resolveRequest(
            place(),
            input({ url: '{{baseUrl}}/pets/{petId}', pathParams: [line('petId', '{{nowhere}}')] }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({ ok: true });
        expect(JSON.stringify(result)).toContain('nowhere');
    });

    it('takes a url typed without its scheme as http', async () => {
        const result = await resolveRequest(place(), input({ url: 'localhost:81/session' }), {
            networkFor: DIRECT_NETWORK,
        });

        expect(result).toMatchObject({ ok: true, value: { url: 'http://localhost:81/session' } });
    });

    it('refuses a url that is not absolute', async () => {
        const result = await resolveRequest(place(), input({ url: '/orders' }), {
            networkFor: DIRECT_NETWORK,
        });

        expect(result).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('throws when a variable could move the authority of the url', async () => {
        await expect(
            resolveRequest(place(), input({ url: 'http://{{baseUrl}}/x' }), {
                networkFor: DIRECT_NETWORK,
            }),
        ).rejects.toBeInstanceOf(UnsafeAuthorityError);
    });
});

describe('resolving against the globals of the origin', () => {
    const declared = (name: string, value: string) => ({
        name,
        value,
        enabled: true,
        secret: false,
    });

    it('resolves a request saved nowhere against its workspace', async () => {
        const result = await resolveRequest(
            place(),
            {
                ...input({ url: '{{baseUrl}}/orders' }),
                itemPath: null,
            },
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({ ok: true, value: { url: 'http://api.test/orders' } });
    });

    it('resolves a name only the globals declare', async () => {
        await writeGlobals(root, { variables: [declared('ruta', 'ws')] });

        const result = await resolveRequest(place(), input({ url: 'http://api.test/{{ruta}}' }), {
            networkFor: DIRECT_NETWORK,
        });

        expect(result).toMatchObject({ ok: true, value: { url: 'http://api.test/ws' } });
    });

    it('throws when a global could move the authority of the url', async () => {
        await writeGlobals(root, { variables: [declared('host', 'a@evil.test')] });

        await expect(
            resolveRequest(place(), input({ url: 'http://{{host}}/x' }), {
                networkFor: DIRECT_NETWORK,
            }),
        ).rejects.toBeInstanceOf(UnsafeAuthorityError);
    });

    it('lets the environment win when both declare the name', async () => {
        await writeGlobals(root, { variables: [declared('page', '9')] });

        const result = await resolveRequest(
            place(),
            input({ url: 'http://api.test/', query: [line('page', '{{page}}')] }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({ ok: true, value: { url: 'http://api.test/?page=2' } });
    });

    it('sends a url that is only a name nobody declares as the text it was written', async () => {
        const result = await resolveRequest(place(), input({ url: '{{ruta}}' }), {
            networkFor: DIRECT_NETWORK,
        });

        expect(result).toMatchObject({ ok: true, value: { url: 'http://{{ruta}}/' } });
    });
});
