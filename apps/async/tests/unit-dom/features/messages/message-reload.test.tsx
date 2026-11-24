import { itemPartsOf, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { createMessageItem, formatResourceUri } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { useMessage } from '../../../../src/renderer/features/messages/hooks/useMessage.js';
import {
    flushPendingMessageWrite,
    scheduleMessageWrite,
} from '../../../../src/renderer/features/messages/lib/pending-message-write.js';
import { reloadMessage } from '../../../../src/renderer/features/messages/lib/reload-message.js';
import { messagesStore } from '../../../../src/renderer/features/messages/messages-store.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'saludo');
const PARTS = itemPartsOf(RESOURCE);

const TYPED = createMessageItem({ name: 'saludo', payload: 'tecleado' });

let calls: string[];

function onDisk(payload: string): unknown {
    return success({ kind: 'message', name: 'saludo', payload });
}

beforeEach(() => {
    vi.restoreAllMocks();
    calls = [];
    messagesStore.getState().reset();
    vi.spyOn(asyncBridge.collections, 'writeItem').mockImplementation(() => {
        calls.push('write');

        return Promise.resolve(success({}));
    });
    vi.spyOn(asyncBridge.collections, 'readItem').mockImplementation(() => {
        calls.push('read');

        return Promise.resolve(onDisk('del disco') as never);
    });
});

afterEach(async () => {
    await flushPendingMessageWrite(RESOURCE);
});

describe('sending the typing of a message that is still waiting', () => {
    it('does nothing when nothing was typed', async () => {
        await flushPendingMessageWrite(RESOURCE);

        expect(calls).toEqual([]);
    });

    it('writes it now and only once', async () => {
        scheduleMessageWrite(RESOURCE, TYPED, () => undefined);

        await flushPendingMessageWrite(RESOURCE);
        await flushPendingMessageWrite(RESOURCE);

        expect(calls).toEqual(['write']);
    });
});

describe('reading a message again because its file changed on disk', () => {
    it('sends what was typed before it reads, so the read never erases the typing', async () => {
        scheduleMessageWrite(RESOURCE, TYPED, () => undefined);

        await reloadMessage(RESOURCE);

        expect(calls).toEqual(['write', 'read']);
        expect(messagesStore.getState().messages[RESOURCE]).not.toEqual(TYPED);
    });

    it('keeps what the window shows when the file cannot be read', async () => {
        messagesStore.getState().setMessage(RESOURCE, TYPED);
        vi.mocked(asyncBridge.collections.readItem).mockResolvedValue({
            ok: false,
            error: { code: 'fs-read', message: 'gone' },
        });

        await reloadMessage(RESOURCE);

        expect(messagesStore.getState().messages[RESOURCE]).toEqual(TYPED);
    });

    it('keeps what the window shows when the file says something Mandor cannot read', async () => {
        messagesStore.getState().setMessage(RESOURCE, TYPED);
        vi.mocked(asyncBridge.collections.readItem).mockResolvedValue(
            success({ kind: 'message', name: 'saludo', payload: 5 }),
        );

        await reloadMessage(RESOURCE);

        expect(messagesStore.getState().messages[RESOURCE]).toEqual(TYPED);
    });

    it('reads nothing for a resource that names no item', async () => {
        await reloadMessage(
            formatResourceUri({
                scope: 'workspace',
                repo: 'local',
                workspace: 'local',
                kind: 'doc',
                path: 'notas.md',
            }),
        );

        expect(calls).toEqual([]);
    });
});

describe('the message a tab shows when its file changes under it', () => {
    function push(path: string): void {
        act(() => {
            (bridge as FakeBridge).emitRepoChanged({
                changes: [{ area: 'collections', workspaceId: PARTS?.workspaceId ?? '', path }],
            });
        });
    }

    async function opened(): Promise<void> {
        renderHook(() => useMessage(RESOURCE), { wrapper: AppProviders });
        await waitFor(() => {
            expect(messagesStore.getState().messages[RESOURCE]).toBeDefined();
        });
        calls.length = 0;
    }

    it('reads it again when its own file changed', async () => {
        await opened();

        push(PARTS?.path ?? '');

        await waitFor(() => {
            expect(calls).toEqual(['read']);
        });
    });

    it('leaves it alone when another item changed', async () => {
        await opened();

        push('otro');

        expect(calls).toEqual([]);
    });
});
