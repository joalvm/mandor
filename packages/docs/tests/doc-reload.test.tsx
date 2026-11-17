import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceDocs } from '../src/index.js';
import { docResource } from '../src/lib/doc-resource.js';
import { docsStore } from '../src/docs-store.js';
import { cancelDocWrite, scheduleDocWrite } from '../src/lib/pending-doc-write.js';
import { reloadDocText } from '../src/lib/reload-doc-text.js';

import { AppProviders } from './support/app-providers.js';

const NOTAS = docResource('local', 'events', 'notas.md');
const OTRA = docResource('local', 'events', 'otra.md');

let calls: string[];

beforeEach(() => {
    vi.restoreAllMocks();
    calls = [];
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([
            { name: 'notas.md', title: 'notas' },
            { name: 'otra.md', title: 'otra' },
        ]),
    );
    vi.spyOn(bridge.doc, 'write').mockImplementation(() => {
        calls.push('write');

        return Promise.resolve(success({}));
    });
    vi.spyOn(bridge.doc, 'read').mockImplementation(() => {
        calls.push('read');

        return Promise.resolve(success('del disco'));
    });
});

afterEach(() => {
    cancelDocWrite(NOTAS);
    cleanup();
    shellStore.getState().reset();
});

function push(...names: string[]): void {
    (bridge as FakeBridge).emitRepoChanged({
        changes: names.map((name) => ({ area: 'doc' as const, workspaceId: 'events', name })),
    });
}

describe('reading a doc again because its file changed on disk', () => {
    it('sends what was typed before it reads, so the read never erases the typing', async () => {
        scheduleDocWrite(NOTAS, 'tecleado', () => undefined);

        await reloadDocText(NOTAS);

        expect(calls).toEqual(['write', 'read']);
        expect(docsStore.getState().texts[NOTAS]).toBe('del disco');
    });

    it('only reads when nothing was typed', async () => {
        await reloadDocText(NOTAS);

        expect(calls).toEqual(['read']);
    });

    it('keeps the text it has when the file cannot be read', async () => {
        docsStore.getState().setText(NOTAS, 'lo que habia');
        vi.mocked(bridge.doc.read).mockResolvedValue({
            ok: false,
            error: { code: 'fs-read', message: 'gone' },
        });

        await reloadDocText(NOTAS);

        expect(docsStore.getState().texts[NOTAS]).toBe('lo que habia');
    });
});

describe('the docs the window keeps when files change under it', () => {
    it('reads the list and the open doc, and leaves the others as they were', async () => {
        docsStore.getState().setText(NOTAS, 'viejo');
        docsStore.getState().setText(OTRA, 'tal cual');
        render(<WorkspaceDocs />, { wrapper: AppProviders });
        await waitFor(() => {
            expect(bridge.doc.list).toHaveBeenCalledTimes(1);
        });

        push('notas.md');

        await waitFor(() => {
            expect(docsStore.getState().texts[NOTAS]).toBe('del disco');
        });
        expect(bridge.doc.list).toHaveBeenCalledTimes(2);
        expect(docsStore.getState().texts[OTRA]).toBe('tal cual');
        expect(bridge.doc.read).toHaveBeenCalledTimes(1);
    });

    it('writes the typing first when the open doc has some waiting', async () => {
        render(<WorkspaceDocs />, { wrapper: AppProviders });
        scheduleDocWrite(NOTAS, 'tecleado', () => undefined);

        push('notas.md');

        await waitFor(() => {
            expect(calls).toEqual(['write', 'read']);
        });
    });

    it('does nothing for a change in another workspace or of another kind', async () => {
        docsStore.getState().setText(NOTAS, 'viejo');
        render(<WorkspaceDocs />, { wrapper: AppProviders });
        await waitFor(() => {
            expect(bridge.doc.list).toHaveBeenCalledTimes(1);
        });

        (bridge as FakeBridge).emitRepoChanged({
            changes: [
                { area: 'doc', workspaceId: 'otro', name: 'notas.md' },
                { area: 'collections', workspaceId: 'events', path: 'x' },
            ],
        });

        expect(bridge.doc.list).toHaveBeenCalledTimes(1);
        expect(docsStore.getState().texts[NOTAS]).toBe('viejo');
    });
});
