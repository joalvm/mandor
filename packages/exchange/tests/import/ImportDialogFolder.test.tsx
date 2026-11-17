import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportDialog } from '../../src/import/components/dialog/ImportDialog.js';
import type { ImportChoice } from '../../src/import/lib/import-choice.js';

import { planOf } from '../support/plan-entries.js';
import { AppProviders } from '../support/providers.js';

const FORMATS: ImportChoice[] = [{ label: 'Bruno', hint: 'a folder', input: 'folder' }];
const picked = { path: 'opencollection.yml', text: 'opencollection: 1.0.0' };

function fileEntry(name: string, text: string) {
    return {
        name,
        isFile: true,
        isDirectory: false,
        file: (resolve: (file: File) => void) => {
            resolve(new File([text], name));
        },
    };
}

function folderEntry(name: string, children: unknown[]) {
    return {
        name,
        isFile: false,
        isDirectory: true,
        createReader: () => {
            const rest = [...children];

            return {
                readEntries: (resolve: (entries: unknown[]) => void) => {
                    resolve(rest.splice(0, rest.length));
                },
            };
        },
    };
}

function open(): void {
    render(
        <ImportDialog
            formats={FORMATS}
            onClose={vi.fn()}
            onImported={vi.fn()}
            scope="collection"
        />,
        { wrapper: AppProviders },
    );
}

describe('the import dialog with a format that lives in a folder', () => {
    beforeEach(() => {
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(success({ files: [picked] }));
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(
            success({ name: 'Tienda', plan: planOf([]) }),
        );
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('asks the dialog of the system for a folder and reads the collection from it', async () => {
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Choose folder' }));
        await screen.findByRole('tree');

        expect(bridge.import.pick).toHaveBeenCalledWith({ input: 'folder' });
        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: [picked],
            scope: 'collection',
        });
    });

    it('asks again for a folder from the summary, the way the first one was asked', async () => {
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Choose folder' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Browse' }));

        await waitFor(() => {
            expect(bridge.import.pick).toHaveBeenCalledTimes(2);
        });

        expect(bridge.import.pick).toHaveBeenLastCalledWith({ input: 'folder' });
    });

    it('reads a dropped folder from inside, each file named by its path under it', async () => {
        open();

        const folder = folderEntry('Tienda', [
            fileEntry('opencollection.yml', 'opencollection: 1.0.0'),
            folderEntry('Pedidos', [fileEntry('Crear.yml', 'info: {}')]),
        ]);

        fireEvent.drop(screen.getByRole('region', { name: 'Drop the document here' }), {
            dataTransfer: { files: [], items: [{ webkitGetAsEntry: () => folder }] },
        });
        await screen.findByRole('tree');

        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: [
                { path: 'opencollection.yml', text: 'opencollection: 1.0.0' },
                { path: 'Pedidos/Crear.yml', text: 'info: {}' },
            ],
            scope: 'collection',
        });
    });
});
