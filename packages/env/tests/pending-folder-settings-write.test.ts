import { failure, success, type Empty, type Result } from '@mandor/ipc';
import type { FolderChainLevel, FolderChainSettings } from '@mandor/schema';
import { bridge, settlePendingWrites } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { envStore } from '../src/env-store.js';
import { chainKey } from '../src/lib/folder-chains.js';
import { scheduleFolderSettingsWrite } from '../src/lib/pending-folder-settings-write.js';

const KEY = chainKey('events', 'pedidos');
const BEARER = { type: 'bearer', token: 'uno' } as const;
const BASIC = { type: 'basic', username: 'ana', password: '' } as const;
const TEAM = { key: 'X-Team', value: 'a', enabled: true };

function chainOf(settings: FolderChainSettings): FolderChainLevel[] {
    return [
        { level: 'folder', place: { kind: 'folder', path: 'pedidos' }, name: 'Pedidos', settings },
        { level: 'workspace', place: { kind: 'workspace' }, name: 'Events', settings: {} },
    ];
}

function shown(): FolderChainSettings | undefined {
    return envStore.getState().folderChains[KEY]?.[0]?.settings;
}

function keepOnScreen(settings: FolderChainSettings): void {
    envStore.setState({ folderChains: { [KEY]: chainOf(settings) } });
}

function answerChainWith(settings: FolderChainSettings): void {
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chainOf(settings)));
}

beforeEach(() => {
    keepOnScreen({});
    answerChainWith({});
});

afterEach(async () => {
    await settlePendingWrites();
    vi.restoreAllMocks();
});

describe('a setting of a folder on its way to disk', () => {
    it('shows at once in the chain, and leaves as a patch after the pause', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BEARER }, vi.fn());

        expect(shown()).toEqual({ auth: BEARER });
        expect(write).not.toHaveBeenCalled();

        answerChainWith({ auth: BEARER });
        await settlePendingWrites();

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'events',
            path: 'pedidos',
            patch: { auth: BEARER },
        });
    });

    it('takes the auth off the level on screen when it goes back to inheriting', () => {
        vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));
        keepOnScreen({ auth: BEARER, description: 'Altas' });

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: null }, vi.fn());

        expect(shown()).toEqual({ description: 'Altas' });
    });

    it('takes the scripts off the level on screen, and out of the file, once none is left', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        keepOnScreen({ scripts: { onResponse: { source: 'a()' } }, description: 'Altas' });
        scheduleFolderSettingsWrite('events', 'pedidos', { scripts: null }, vi.fn());

        expect(shown()).toEqual({ description: 'Altas' });

        await settlePendingWrites();

        expect(write.mock.calls[0]?.[0].patch).toEqual({ scripts: null });
    });

    it('takes the imported scripts off the level on screen once the last one was moved', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));
        const moved = { onBeforeRequest: { source: 'pm.x()' } };

        keepOnScreen({
            importedScripts: [{ event: 'onBeforeRequest', dialect: 'postman', source: 'pm.x()' }],
        });
        scheduleFolderSettingsWrite(
            'events',
            'pedidos',
            { scripts: moved, importedScripts: null },
            vi.fn(),
        );

        expect(shown()).toEqual({ scripts: moved });

        await settlePendingWrites();

        expect(write.mock.calls[0]?.[0].patch).toEqual({ scripts: moved, importedScripts: null });
    });

    it('sends what one pause gathered in one patch, without one edit erasing the other', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BEARER }, vi.fn());
        scheduleFolderSettingsWrite('events', 'pedidos', { headers: [TEAM] }, vi.fn());

        expect(shown()).toEqual({ auth: BEARER, headers: [TEAM] });

        await settlePendingWrites();

        expect(write).toHaveBeenCalledOnce();
        expect(write.mock.calls[0]?.[0].patch).toEqual({ auth: BEARER, headers: [TEAM] });
    });

    it('sends one write at a time: a later edit waits for the earlier one to land', async () => {
        const sent: unknown[] = [];
        const landing: ((answer: Result<Empty>) => void)[] = [];

        vi.spyOn(bridge.collections, 'writeSettings').mockImplementation((input) => {
            sent.push(input.patch);

            return new Promise((resolve) => {
                landing.push(resolve);
            });
        });

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BEARER }, vi.fn());

        const first = settlePendingWrites();

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BASIC }, vi.fn());

        const second = settlePendingWrites();

        await Promise.resolve();

        expect(sent).toEqual([{ auth: BEARER }]);

        landing[0]?.(success({}));
        await first;
        await vi.waitFor(() => {
            expect(sent).toEqual([{ auth: BEARER }, { auth: BASIC }]);
        });

        landing[1]?.(success({}));
        await second;
    });

    it('keeps writing after a write that never answered, in the order they were made', async () => {
        const write = vi
            .spyOn(bridge.collections, 'writeSettings')
            .mockRejectedValueOnce(new Error('the bridge broke'))
            .mockResolvedValue(success({}));

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BEARER }, vi.fn());
        await expect(settlePendingWrites()).rejects.toThrow('the bridge broke');

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BASIC }, vi.fn());
        await settlePendingWrites();

        expect(write).toHaveBeenLastCalledWith({
            workspaceId: 'events',
            path: 'pedidos',
            patch: { auth: BASIC },
        });
    });

    it('tells a refusal and goes back to what the disk holds', async () => {
        const onRefused = vi.fn();

        vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(
            failure('not-found', 'the folder is gone'),
        );
        answerChainWith({ auth: BASIC });

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BEARER }, onRefused);
        await settlePendingWrites();

        expect(onRefused).toHaveBeenCalledWith('not-found');
        expect(shown()).toEqual({ auth: BASIC });
    });

    it('keeps on screen what was typed while the write landed and the chain was read', async () => {
        vi.spyOn(bridge.collections, 'writeSettings').mockImplementationOnce(() => {
            scheduleFolderSettingsWrite('events', 'pedidos', { auth: BASIC }, vi.fn());

            return Promise.resolve(success({}));
        });
        answerChainWith({ auth: BEARER });

        scheduleFolderSettingsWrite('events', 'pedidos', { auth: BEARER }, vi.fn());
        await vi.waitFor(async () => {
            await settlePendingWrites();
            expect(bridge.collections.chain).toHaveBeenCalled();
        });

        expect(shown()).toEqual({ auth: BASIC });
    });

    it('keeps on screen a line half typed, and sends the file only the named ones', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));
        const named = { enabled: true, key: 'X-Tenant', value: 'acme' };
        const half = { enabled: true, key: '', value: 'a medias' };

        scheduleFolderSettingsWrite('events', 'pedidos', { headers: [named, half] }, vi.fn());
        answerChainWith({ headers: [named] });
        await settlePendingWrites();

        expect(write.mock.calls[0]?.[0].patch).toEqual({ headers: [named] });
        expect(shown()).toEqual({ headers: [named, half] });
    });
});
