import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { closeRepo } from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { payload, useGraphqlWorld } from './support/graphql-world.js';

const world = useGraphqlWorld();

describe('the channels of the schema of a server, when they cannot answer', () => {
    it('answers nothing when the request cannot be resolved yet, and refuses to ask', async () => {
        expect(
            await world.ipc.call(CHANNELS.graphqlSchemaRead, payload('{{nobody}}/graphql')),
        ).toEqual({ ok: true, value: null });
        expect(
            await world.ipc.call(CHANNELS.graphqlIntrospect, payload('{{nobody}}/graphql')),
        ).toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(world.seen).toEqual([]);
    });

    it('says why the server gave no schema, in the code of its own', async () => {
        expect(
            await world.ipc.call(CHANNELS.graphqlIntrospect, payload('{{baseUrl}}/denied')),
        ).toEqual({
            ok: false,
            error: { code: 'graphql-introspection', message: 'introspection is disabled' },
        });
        expect(
            await world.ipc.call(CHANNELS.graphqlIntrospect, payload('{{baseUrl}}/page')),
        ).toMatchObject({ ok: false, error: { code: 'graphql-introspection' } });
        expect(await readdir(join(world.root, '.mandor')).catch(() => [])).not.toContain('graphql');
    });

    /** A schema is not a send: nothing names what it would spill, so nothing would ever remove it. */
    it('stops reading a schema past the most it takes, and leaves nothing of it on disk', async () => {
        expect(
            await world.ipc.call(CHANNELS.graphqlIntrospect, payload('{{baseUrl}}/huge')),
        ).toMatchObject({ ok: false, error: { code: 'request-too-large' } });
        expect(await readdir(join(world.root, '.mandor', 'bodies')).catch(() => [])).toEqual([]);
    });

    /**
     * Port 1 has nobody listening. A port of the test closed a moment ago does not do: another
     * worker can be given it before the introspection leaves, and its server answers instead.
     */
    it('names a server that cannot be reached by the code of every send', async () => {
        expect(
            await world.ipc.call(CHANNELS.graphqlIntrospect, payload('http://127.0.0.1:1/graphql')),
        ).toMatchObject({ ok: false, error: { code: 'request-unreachable' } });
    });

    it('cuts what is still in flight when it is disposed', async () => {
        const pending = world.ipc.call(CHANNELS.graphqlIntrospect, payload('{{baseUrl}}/slow'));

        await vi.waitFor(() => {
            expect(world.seen.map((each) => each.url)).toContain('/slow');
        });
        world.dispose();

        expect(await pending).toMatchObject({ ok: false, error: { code: 'request-aborted' } });
    });

    it('refuses what the contract does not describe, on both channels', async () => {
        for (const channel of [CHANNELS.graphqlSchemaRead, CHANNELS.graphqlIntrospect]) {
            expect(await world.ipc.call(channel, { nope: true })).toMatchObject({
                ok: false,
                error: { code: 'bad-request' },
            });
        }
    });

    it('refuses while no origin is open', async () => {
        closeRepo();

        expect(
            await world.ipc.call(CHANNELS.graphqlIntrospect, payload('{{baseUrl}}/graphql')),
        ).toMatchObject({ ok: false });
    });
});
