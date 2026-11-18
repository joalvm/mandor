import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { spyBridgeIpc } from '@mandor/host/testing/bridge';
import { CHANNELS } from '@mandor/ipc';
import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { createGraphqlBridge } from '../../../src/preload/graphql-bridge.js';

const INPUT = {
    environmentId: null,
    itemPath: 'orders/list',
    request: createRequestItem({ name: 'list' }),
    workspaceId: 'demo',
};

const CACHE = {
    fetchedAt: '2026-09-01T10:00:00.000Z',
    introspection: { __schema: { types: [] } },
};

describe('the graphql bridge', () => {
    it('reads the schema that is kept and asks for a new one on the channels that own them', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.graphqlSchemaRead]: { ok: true, value: null },
            [CHANNELS.graphqlIntrospect]: { ok: true, value: CACHE },
        });
        const bridge = createGraphqlBridge(bridgeKitOf(ipc));

        expect(await bridge.readSchema(INPUT)).toEqual({ ok: true, value: null });
        expect(await bridge.introspect(INPUT)).toEqual({ ok: true, value: CACHE });
        expect(ipc.calls).toEqual([
            [CHANNELS.graphqlSchemaRead, INPUT],
            [CHANNELS.graphqlIntrospect, INPUT],
        ]);
    });

    it('answers a refusal as it is', async () => {
        const refusal = {
            ok: false,
            error: { code: 'graphql-introspection', message: 'no schema' },
        };
        const bridge = createGraphqlBridge(
            bridgeKitOf(spyBridgeIpc({ [CHANNELS.graphqlIntrospect]: refusal })),
        );

        expect(await bridge.introspect(INPUT)).toEqual(refusal);
    });

    /** What main answers is validated here: an answer out of contract is a bug in main. */
    it('throws on an answer that does not match its contract', async () => {
        const bridge = createGraphqlBridge(
            bridgeKitOf(
                spyBridgeIpc({
                    [CHANNELS.graphqlSchemaRead]: { ok: true, value: { fetchedAt: 'yesterday' } },
                    [CHANNELS.graphqlIntrospect]: { ok: true, value: {} },
                }),
            ),
        );

        await expect(bridge.readSchema(INPUT)).rejects.toThrow();
        await expect(bridge.introspect(INPUT)).rejects.toThrow();
    });
});
