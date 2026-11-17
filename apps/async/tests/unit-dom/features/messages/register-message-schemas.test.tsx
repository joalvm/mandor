import { collectionStore, itemResource } from '@mandor/collections';
import { MESSAGE_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { originName, shellStore } from '@mandor/shell';
import { describe, expect, it } from 'vitest';

import { inboundSchemas } from '../../../../src/renderer/activity/inbound-schema.js';
import { registerMessageSchemas } from '../../../../src/renderer/features/messages/lib/register-message-schemas.js';
import { messagesStore } from '../../../../src/renderer/features/messages/index.js';

const PEDIDO: CollectionNode = {
    kind: 'item',
    itemKind: MESSAGE_ITEM_KIND,
    name: 'Pedido creado',
    path: 'pedido-creado',
    tags: [],
};

function register(): () => void {
    collectionStore.getState().reset();
    collectionStore.getState().setNodes([PEDIDO]);
    messagesStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    messagesStore.getState().setMessage(itemResource(originName(), 'events', 'pedido-creado'), {
        name: 'Pedido creado',
        channel: 'pedidos.creado',
        payload: '',
        payloadType: 'json',
        schema: '{"type": "object"}',
    });

    return registerMessageSchemas();
}

describe('the inbound schemas of the messages feature', () => {
    it('answers the schema of the message that owns the channel', async () => {
        const off = register();
        const provider = inboundSchemas();

        await expect(provider?.schemaForChannel('pedidos.creado')).resolves.toBe(
            '{"type": "object"}',
        );

        off();
    });

    it('answers silence for a channel no message declares, and stops asking', async () => {
        const off = register();
        const provider = inboundSchemas();

        await expect(provider?.schemaForChannel('otros')).resolves.toBeUndefined();
        await expect(provider?.schemaForChannel('otros')).resolves.toBeUndefined();

        off();
    });
});
