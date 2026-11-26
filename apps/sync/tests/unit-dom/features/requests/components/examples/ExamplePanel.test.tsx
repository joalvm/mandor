import { exampleResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { paneLayoutStore, shellStore, TabProvider, togglePaneLayout } from '@mandor/shell';
import { byPart } from '@mandor/ui/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../../../src/renderer/app/sync-bridge.js';
import { ExamplePanel } from '../../../../../../src/renderer/features/requests/components/examples/ExamplePanel.js';
import { requestsStore } from '../../../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../../../support/app-providers.js';
import { flush } from '../../../../support/flush.js';
import { httpResponseWith, textBody } from '../../../../support/http-response.js';

const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const FILE = {
    examples: [
        { body: '{"id":1}', contentType: 'application/json', name: 'Creado', status: '201' },
    ],
    kind: 'request',
    method: 'POST',
    name: 'crear pedido',
    query: [{ enabled: false, key: 'dryRun', value: 'true' }],
    url: '{{baseUrl}}/pedidos',
};

/** The write the bridge hears, as the caller built it. */
type WriteCall = {
    fields?: {
        examples?: { request?: Record<string, unknown>; schema?: string }[];
    };
};

function draw(): void {
    render(
        <TabProvider value={{ resource: RESOURCE, tabId: RESOURCE }}>
            <ExamplePanel />
        </TabProvider>,
        { wrapper: AppProviders },
    );
}

async function toggleQueryRow(): Promise<void> {
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Send this entry' }));
    await flush();
}

describe('the panel of an example', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(FILE));
    });

    afterEach(() => {
        cleanup();
        requestsStore.getState().reset();
        shellStore.getState().reset();
        paneLayoutStore.setState(paneLayoutStore.getInitialState());
    });

    it('shows the method and the url of its request, which it does not edit', async () => {
        draw();

        const address = await screen.findByRole('textbox', { name: 'URL' });

        expect(address).toHaveTextContent('{{baseUrl}}/pedidos');
        expect(address).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByText('POST')).toBeVisible();
    });

    it('draws the destination above the request and the response, each on a named card', async () => {
        draw();

        const target = await screen.findByRole('region', { name: 'Target' });

        expect(target).toContainElement(screen.getByRole('textbox', { name: 'URL' }));
        expect(target).toHaveAttribute('data-size', 'content');
        expect(screen.getByRole('region', { name: 'Request' })).toContainElement(
            await screen.findByRole('tab', { name: 'Params' }),
        );
        expect(screen.getByRole('region', { name: 'Response' })).toBeInTheDocument();
    });

    /** An example stands its halves as the request it belongs to does. */
    it('stands the request beside its response, and over it once the layout turns', async () => {
        draw();

        await screen.findByRole('region', { name: 'Request' });

        expect(byPart('split-pane')).toHaveAttribute('data-direction', 'row');

        act(() => {
            togglePaneLayout();
        });

        expect(byPart('split-pane')).toHaveAttribute('data-direction', 'column');
    });

    it('names the example at the end of the breadcrumb, under its request', async () => {
        draw();

        const trail = await screen.findByRole('region', { name: 'Where this request is' });

        expect(trail).toHaveTextContent('crear pedido');
        expect(trail).toHaveTextContent('Creado');
    });

    it('draws the sections of the request, inherited, and no section of examples', async () => {
        draw();

        expect(await screen.findByRole('tab', { name: 'Params', selected: true })).toBeVisible();
        expect(screen.queryByRole('tab', { name: /^Examples/u })).toBeNull();
        expect(screen.getByRole('checkbox', { name: 'Send this entry' })).not.toBeChecked();
    });

    it('keeps an edit as a draft of the example, and writes nothing until it is saved', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        draw();
        await toggleQueryRow();

        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeDefined();
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('Ctrl+S writes only what the example changes of its request', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        draw();
        await toggleQueryRow();
        fireEvent.keyDown(screen.getByRole('group', { name: 'Example' }), {
            ctrlKey: true,
            key: 's',
        });

        await waitFor(() => {
            expect(writeItem).toHaveBeenCalledOnce();
        });

        const { fields } = writeItem.mock.calls[0]?.[0] as WriteCall;

        expect(Object.keys(fields ?? {}).sort()).toEqual(['examples', 'kind', 'name']);
        expect(Object.keys(fields?.examples?.[0]?.request ?? {})).toEqual(['query']);
    });

    it('going back to what the request holds lets the draft go', async () => {
        draw();
        await toggleQueryRow();

        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeDefined();

        await toggleQueryRow();

        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeUndefined();
    });

    it('Ctrl+Enter sends the example and the Differences tab counts what differs', async () => {
        const send = vi
            .spyOn(syncBridge.request, 'send')
            .mockResolvedValue(
                success(httpResponseWith({ body: textBody('{"id":"2"}'), status: 201 })),
            );

        draw();
        await screen.findByRole('group', { name: 'Example' });
        fireEvent.keyDown(screen.getByRole('group', { name: 'Example' }), {
            ctrlKey: true,
            key: 'Enter',
        });

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: /^Differences/u })).toHaveTextContent('1');
        });

        expect(send).toHaveBeenCalledOnce();
        expect(requestsStore.getState().sends[RESOURCE]?.state).toBe('done');
    });

    it('draws nothing for an example the file lost', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({ ...FILE, examples: [] }),
        );

        draw();
        await flush();

        expect(screen.queryByRole('group', { name: 'Example' })).toBeNull();
    });
});

describe('the panel of an example, once an answer came', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(FILE));
        vi.spyOn(syncBridge.request, 'send').mockResolvedValue(
            success(httpResponseWith({ body: textBody('{"id":"2"}'), status: 201 })),
        );
    });

    afterEach(() => {
        cleanup();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    async function sendAndOpenDifferences(): Promise<void> {
        draw();
        fireEvent.keyDown(await screen.findByRole('group', { name: 'Example' }), {
            ctrlKey: true,
            key: 'Enter',
        });
        fireEvent.mouseDown(await screen.findByRole('tab', { name: /^Differences/u }));
        fireEvent.click(screen.getByRole('tab', { name: /^Differences/u }));
    }

    it('accepting the received answer makes it the example, as a draft, and nothing differs', async () => {
        await sendAndOpenDifferences();
        fireEvent.click(await screen.findByRole('button', { name: 'Accept received' }));

        await waitFor(() => {
            expect(requestsStore.getState().exampleDrafts[RESOURCE]?.example.body).toContain(
                '"id"',
            );
        });

        expect(requestsStore.getState().exampleDrafts[RESOURCE]?.example.body).toContain('"2"');
        expect(screen.queryByRole('button', { name: 'Accept received' })).toBeNull();
        expect(screen.getByRole('heading', { name: 'No differences' })).toBeVisible();
        expect(screen.getByText('Send again to look for new changes.')).toBeVisible();
        expect(document.querySelector('[data-part="example-diff-editor"]')).toBeNull();
    });

    it('writes the schema generated from the body with the example, in one write', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        draw();
        fireEvent.mouseDown(await screen.findByRole('tab', { name: /^Schema/u }));
        fireEvent.click(await screen.findByRole('button', { name: 'Generate from the body' }));
        fireEvent.keyDown(screen.getByRole('group', { name: 'Example' }), {
            ctrlKey: true,
            key: 's',
        });

        await waitFor(() => {
            expect(writeItem).toHaveBeenCalledOnce();
        });

        const { fields } = writeItem.mock.calls[0]?.[0] as WriteCall;

        expect(JSON.parse(fields?.examples?.[0]?.schema ?? 'null')).toMatchObject({
            properties: { id: { type: 'number' } },
        });
        expect(fields?.examples).toHaveLength(1);
    });
});
