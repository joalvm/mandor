import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { payload, useGraphqlWorld } from './support/graphql-world.js';

const world = useGraphqlWorld();

describe('the channels of the schema of a server', () => {
    it('registers the two channels and removes them both', () => {
        expect(world.ipc.registered()).toEqual([
            CHANNELS.graphqlSchemaRead,
            CHANNELS.graphqlIntrospect,
        ]);

        world.dispose();

        expect(world.ipc.registered()).toEqual([]);
    });

    it('asks the server for its schema with a POST of the introspection query, whatever the request says', async () => {
        const answered = await world.ipc.call(
            CHANNELS.graphqlIntrospect,
            payload('{{baseUrl}}/graphql', { method: 'GET' }),
        );

        expect(answered).toMatchObject({
            ok: true,
            value: { introspection: { __schema: { queryType: { name: 'Query' } } } },
        });
        expect(world.seen).toHaveLength(1);
        expect(world.seen[0]).toMatchObject({
            method: 'POST',
            url: '/graphql',
            type: 'application/json',
        });
        expect(JSON.parse(world.seen[0]?.body ?? '{}')).toEqual({
            query: expect.stringContaining('__schema') as string,
        });
    });

    it('is not asked to resolve the variables of a body it does not send', async () => {
        const answered = await world.ipc.call(
            CHANNELS.graphqlIntrospect,
            payload('{{baseUrl}}/graphql', {
                method: 'POST',
                body: { type: 'graphql', query: '{ a }', variables: '{ "id": {{nobody}} }' },
            }),
        );

        expect(answered).toMatchObject({ ok: true });
    });

    it('keeps the schema, and reads it back without asking the server again', async () => {
        const asked = await world.ipc.call(
            CHANNELS.graphqlIntrospect,
            payload('{{baseUrl}}/graphql'),
        );
        const read = await world.ipc.call(
            CHANNELS.graphqlSchemaRead,
            payload('{{baseUrl}}/graphql'),
        );

        expect(read).toEqual(asked);
        expect(world.seen).toHaveLength(1);
        expect(await readdir(join(world.root, '.mandor', 'graphql', 'payments'))).toHaveLength(1);
    });

    it('is not a send: nothing of it reaches the history', async () => {
        await world.ipc.call(CHANNELS.graphqlIntrospect, payload('{{baseUrl}}/graphql'));

        await expect(readdir(join(world.root, '.mandor', 'history'))).rejects.toThrow();
    });

    it('answers nothing for a server whose schema was never fetched', async () => {
        expect(
            await world.ipc.call(CHANNELS.graphqlSchemaRead, payload('{{baseUrl}}/graphql')),
        ).toEqual({ ok: true, value: null });
    });

    it('keeps one schema for each environment: the same url under none has none', async () => {
        await world.ipc.call(CHANNELS.graphqlIntrospect, payload(`${world.origin}/graphql`));

        expect(
            await world.ipc.call(
                CHANNELS.graphqlSchemaRead,
                payload(`${world.origin}/graphql`, {}, 'local'),
            ),
        ).toMatchObject({ ok: true, value: { fetchedAt: expect.any(String) as string } });
        expect(
            await world.ipc.call(
                CHANNELS.graphqlSchemaRead,
                payload(`${world.origin}/graphql`, {}, null),
            ),
        ).toEqual({ ok: true, value: null });
    });
});
