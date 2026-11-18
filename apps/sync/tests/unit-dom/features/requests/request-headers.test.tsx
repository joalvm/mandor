import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { itemResource } from '@mandor/collections';
import type { RequestItem } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestHeaders } from '../../../../src/renderer/features/requests/components/headers/RequestHeaders.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const REQUEST: RequestItem = {
    auth: { token: 't', type: 'bearer' },
    body: { type: 'json', content: '{}' },
    examples: [],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '{{base}}/pedidos',
};

function draw(
    request: RequestItem,
    onFollow: (section: 'auth' | 'body') => void = () => undefined,
    onChange: (headers: RequestItem['headers']) => void = () => undefined,
): void {
    render(
        <RequestHeaders
            environment={undefined}
            onChange={onChange}
            onFollow={onFollow}
            onVariablesChange={() => undefined}
            request={request}
            resource={RESOURCE}
        />,
        { wrapper: AppProviders },
    );
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeWorkspaceId: 'local' });
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success([]));
});

afterEach(() => {
    cleanup();
    envStore.getState().reset();
    shellStore.getState().reset();
    vi.restoreAllMocks();
});

async function showAutoRows(): Promise<NodeListOf<HTMLElement>> {
    fireEvent.click(await screen.findByRole('button', { name: '9 hidden' }));

    return waitFor(() => {
        const rows = document.querySelectorAll<HTMLElement>('[data-part="key-value-auto-row"]');

        expect(rows).toHaveLength(9);

        return rows;
    });
}

describe('the headers table of a request', () => {
    it('says the rows the request adds behind their count, each one locked', async () => {
        draw(REQUEST);

        const rows = await showAutoRows();
        const auth = rows[0];
        const type = rows[1];

        if (auth === undefined || type === undefined) {
            throw new Error('the rows the app adds are not there');
        }

        expect(within(auth).getByText('Authorization')).toBeVisible();
        expect(within(type).getByText('application/json')).toBeVisible();

        for (const check of screen.getAllByRole('checkbox', { name: 'Send this entry' })) {
            expect(check).toBeDisabled();
        }
    });

    it('the row a written header takes over is said struck through', async () => {
        draw({
            ...REQUEST,
            headers: [{ enabled: true, key: 'Authorization', value: 'own' }],
        });

        const rows = await showAutoRows();
        const struck = rows[0]?.querySelector('[data-overridden="true"]');

        expect(struck).not.toBeNull();
        expect(struck?.textContent).toContain('Authorization');
    });

    it('a row the app adds speaks its way out: the deep link lands on the tab that sets it', async () => {
        const onFollow = vi.fn();

        draw(REQUEST, onFollow);

        fireEvent.click(await screen.findByRole('button', { name: '9 hidden' }));
        fireEvent.click(screen.getByRole('button', { name: 'Go to Authorization' }));

        expect(onFollow).toHaveBeenCalledWith('auth');
    });

    it('the deep link of the content type lands on the body', async () => {
        const onFollow = vi.fn();

        draw(REQUEST, onFollow);

        fireEvent.click(await screen.findByRole('button', { name: '9 hidden' }));
        fireEvent.click(screen.getByRole('button', { name: 'Go to Body' }));

        expect(onFollow).toHaveBeenCalledWith('body');
    });

    it('writes the table back into the headers, the ghost row spawning one more', async () => {
        const onChange = vi.fn();

        draw(REQUEST, () => undefined, onChange);

        await screen.findByRole('button', { name: '9 hidden' });

        const keys = screen.getAllByRole('textbox', { name: 'Key' });
        const ghost = keys[0];

        if (ghost === undefined) {
            throw new Error('the empty row is not there');
        }

        fireEvent.focus(ghost);
        ghost.textContent = 'Accept';
        fireEvent.input(ghost);

        expect(onChange).toHaveBeenCalledWith([{ enabled: true, key: 'Accept', value: '' }]);
    });

    /** A header promises a type for its value, the way a param does. */
    it('offers a type for each header written', async () => {
        draw({ ...REQUEST, headers: [{ enabled: true, key: 'X-Retries', value: '3' }] });

        await screen.findByRole('button', { name: '9 hidden' });

        expect(screen.getAllByRole('button', { name: 'Type' }).length).toBeGreaterThan(0);
    });

    it('says under the table what the levels above hand down', async () => {
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(
            success([
                {
                    level: 'collection',
                    place: { kind: 'folder', path: 'pedidos' },
                    name: 'Pedidos',
                    settings: { headers: [{ enabled: true, key: 'Accept', value: 'text/plain' }] },
                },
            ]),
        );
        draw(REQUEST);

        fireEvent.click(await screen.findByRole('button', { name: 'Inherited (1)' }));

        expect(screen.getByText('Pedidos')).toBeVisible();
    });
});
