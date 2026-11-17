import { failure, success, type ImportPicked, type ImportPlan, type Result } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportDialog } from '../../src/import/components/dialog/ImportDialog.js';

import { AppProviders } from '../support/providers.js';

const dropped = { path: 'pasarela.yaml', text: 'asyncapi: 3.0.0' };
const origin = { kind: 'asyncapi' as const, sourceId: 'abc' };

function entry(place: 'folder' | 'item', route: string): ImportPlan['entries'][number] {
    return {
        class: 'add',
        place,
        route,
        name: route,
        resource: {
            place,
            itemKind: place === 'item' ? 'message' : null,
            route,
            name: route,
            fields: {},
            origin,
            degradations: [],
        },
        selected: true,
    };
}

const plan: ImportPlan = {
    identity: origin,
    entries: [entry('folder', 'pedidos'), entry('item', 'pedidos/registrar')],
};

function open(onClose = vi.fn(), onImported = vi.fn()): void {
    render(
        <ImportDialog
            formats={[{ label: 'AsyncAPI', hint: '2.x or 3.x, as JSON or YAML', input: 'files' }]}
            onClose={onClose}
            onImported={onImported}
            scope="collection"
        />,
        { wrapper: AppProviders },
    );
}

describe('the import dialog', () => {
    beforeEach(() => {
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(success({ name: 'Pasarela', plan }));
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(success({ files: [dropped] }));
        vi.spyOn(bridge.import, 'apply').mockResolvedValue(
            success({ applied: 2, workspaceId: 'personal' }),
        );
    });

    it('shows the dropzone first, and the tree once the document was read', async () => {
        open();

        expect(screen.getByRole('region', { name: 'Drop the document here' })).toBeVisible();
        expect(screen.getByRole('listitem')).toHaveTextContent(
            'AsyncAPI 2.x or 3.x, as JSON or YAML',
        );
        expect(screen.queryByRole('tree')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));

        await waitFor(() => {
            expect(screen.getByRole('tree', { name: 'What would enter' })).toBeVisible();
        });

        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: [dropped],
            scope: 'collection',
        });
    });

    it('asks the dialog of the system for as many files as the format may need', async () => {
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        await screen.findByRole('tree');

        expect(bridge.import.pick).toHaveBeenCalledWith({ input: 'files' });
    });

    it('reads every file that was dropped, not only the first', async () => {
        open();

        const first = { name: 'a.json', size: 7, text: () => Promise.resolve('{"a":1}') } as File;
        const second = { name: 'b.json', size: 7, text: () => Promise.resolve('{"b":2}') } as File;

        fireEvent.drop(screen.getByRole('region', { name: 'Drop the document here' }), {
            dataTransfer: { files: [first, second], items: [] },
        });
        await screen.findByRole('tree');

        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: [
                { path: 'a.json', text: '{"a":1}' },
                { path: 'b.json', text: '{"b":2}' },
            ],
            scope: 'collection',
        });
    });

    it('says how the read of a pick goes, and stops it when asked', async () => {
        let push: (progress: { files: number }) => void = () => undefined;
        let answer: (picked: Result<ImportPicked>) => void = () => undefined;

        vi.spyOn(bridge.import, 'onProgress').mockImplementation((handler) => {
            push = handler;

            return () => undefined;
        });
        vi.spyOn(bridge.import, 'pick').mockReturnValue(
            new Promise((resolve) => {
                answer = resolve;
            }),
        );

        const cancel = vi.spyOn(bridge.import, 'cancel');

        open();
        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        act(() => {
            push({ files: 50 });
        });

        expect(screen.getByText('Reading files… 50')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Stop reading' }));

        expect(cancel).toHaveBeenCalledOnce();

        act(() => {
            answer(success({ files: null }));
        });

        expect(await screen.findByRole('button', { name: 'Choose file' })).toBeVisible();
        expect(bridge.import.plan).not.toHaveBeenCalled();
    });

    it('stops the read under way when the dialog closes', async () => {
        vi.spyOn(bridge.import, 'plan').mockReturnValue(new Promise(() => undefined));

        const cancel = vi.spyOn(bridge.import, 'cancel');

        open();
        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        await screen.findByRole('button', { name: 'Stop reading' });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(cancel).toHaveBeenCalledOnce();
    });

    it('says nothing when the person stopped the reading of the document', async () => {
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(
            failure('import-cancelled', 'the import was cancelled'),
        );

        open();
        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));

        await waitFor(() => {
            expect(bridge.import.plan).toHaveBeenCalled();
        });

        expect(await screen.findByRole('button', { name: 'Choose file' })).toBeVisible();
        expect(screen.queryByText('The import was cancelled.')).toBeNull();
    });

    it('names the document and puts the whole choice on top of the tree', async () => {
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));

        expect(await screen.findByText('Pasarela')).toBeVisible();
        expect(screen.getByRole('treeitem', { name: 'Everything' })).toBeVisible();
    });

    it('imports what is left marked, tells the app and then closes', async () => {
        const onClose = vi.fn();
        const onImported = vi.fn();

        open(onClose, onImported);

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        await screen.findByRole('tree');

        const importButton = screen.getByRole('button', { name: 'Import' });

        expect(importButton).toBeEnabled();

        fireEvent.click(importButton);

        await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });

        expect(bridge.import.apply).toHaveBeenCalledTimes(1);
        expect(onImported).toHaveBeenCalledWith({ workspaceId: 'personal' });
    });
});
