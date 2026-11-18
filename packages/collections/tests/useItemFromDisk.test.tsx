import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge } from '@mandor/shell';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useItemFromDisk } from '../src/hooks/useItemFromDisk.js';
import { itemResource } from '../src/lib/item-resource.js';

import { AppProviders } from './support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

function Harness({ load, reload }: Parameters<typeof useItemFromDisk>[1]) {
    useItemFromDisk(RESOURCE, { load, reload });

    return <span />;
}

afterEach(cleanup);

describe('the item behind a resource, kept in step with the disk', () => {
    it('reads the item once, when somebody first looks at it', async () => {
        const load = vi.fn(() => Promise.resolve(null));

        render(<Harness load={load} reload={vi.fn()} />, { wrapper: AppProviders });

        await waitFor(() => {
            expect(load).toHaveBeenCalledWith(RESOURCE);
        });

        expect(load).toHaveBeenCalledTimes(1);
    });

    it('tells a failed read as a toast', async () => {
        const load = vi.fn(() => Promise.resolve('fs-read' as const));

        render(<Harness load={load} reload={vi.fn()} />, { wrapper: AppProviders });

        expect(
            await screen.findByText('Mandor could not read the requested file.'),
        ).toBeInTheDocument();
    });

    it('reads the item again when its file changed on disk, and only its file', async () => {
        const reload = vi.fn(() => Promise.resolve());

        render(<Harness load={() => Promise.resolve(null)} reload={reload} />, {
            wrapper: AppProviders,
        });
        (bridge as FakeBridge).emitRepoChanged({
            changes: [{ area: 'collections', workspaceId: 'local', path: 'otro' }],
        });

        expect(reload).not.toHaveBeenCalled();

        (bridge as FakeBridge).emitRepoChanged({
            changes: [{ area: 'collections', workspaceId: 'local', path: 'crear-pedido' }],
        });

        await waitFor(() => {
            expect(reload).toHaveBeenCalledWith(RESOURCE);
        });
    });
});
