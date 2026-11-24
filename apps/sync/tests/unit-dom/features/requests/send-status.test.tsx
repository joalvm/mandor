import { consoleStore, registerSurface, selectTabs, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenHistoryButton } from '../../../../src/renderer/features/requests/components/response/OpenHistoryButton.js';
import { SendStatus } from '../../../../src/renderer/features/requests/components/response/SendStatus.js';
import { scriptOutputStore } from '../../../../src/renderer/features/requests/lib/script-output-store.js';
import type { ScriptOutput } from '../../../../src/renderer/response/lib/script-output.js';
import { AppProviders } from '../../support/app-providers.js';
import { httpResponseWith as httpResponse } from '../../support/http-response.js';

const SEND = '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11';

const SILENT: ScriptOutput = {
    logs: [],
    tests: [],
    skipped: [],
    switchedOff: 0,
    errors: [],
    withheld: [],
    destinationMoved: false,
};

/** What the scripts of the send said, filed as main would have told it, in the workspace pagos. */
function told(output: Partial<ScriptOutput>): void {
    scriptOutputStore.setState({
        runs: {
            [SEND]: {
                place: { workspaceId: 'pagos', environmentId: 'prod', title: 'GET altas' },
                output: { ...SILENT, ...output },
                bytes: 0,
                told: 1,
            },
        },
    });
}

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
    scriptOutputStore.getState().reset();
    consoleStore.getState().hide();
    vi.restoreAllMocks();
});

describe('the line over a response that has not come', () => {
    it('says the request has not been sent', () => {
        render(<SendStatus entry={{ state: 'idle' }} />, { wrapper: AppProviders });

        expect(screen.getByText('Send the request to see its response here.')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'View in history' })).toBeNull();
    });

    it('says it is sending, with no way to the history yet', () => {
        render(
            <SendStatus
                entry={{ sendId: '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11', state: 'sending' }}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('Sending…')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'View in history' })).toBeNull();
    });

    it('says why a send failed, and offers the history where it was kept', () => {
        render(<SendStatus entry={{ error: 'request-timeout', state: 'failed' }} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByText('The server did not answer in time.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'View in history' })).toBeVisible();
    });
});

describe('the way to the history', () => {
    it('asks the window to open the surface of the history in the active workspace', () => {
        const open = vi.fn();
        const unregister = registerSurface({ id: 'history', open });

        render(<OpenHistoryButton />, { wrapper: AppProviders });
        fireEvent.click(screen.getByRole('button', { name: 'View in history' }));
        unregister();

        expect(open).toHaveBeenCalledOnce();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    it('does nothing when nobody has built the history', () => {
        render(<OpenHistoryButton />, { wrapper: AppProviders });

        expect(() => {
            fireEvent.click(screen.getByRole('button', { name: 'View in history' }));
        }).not.toThrow();
    });
});

describe('the way out of a script that broke the send', () => {
    it('offers to send again without scripts, and the console, which it leaves put away', () => {
        const again = vi.fn();

        told({ logs: [{ level: 'log', text: 'antes de romper' }] });
        render(
            <SendStatus
                entry={{ error: 'script-failed', sendId: SEND, state: 'failed' }}
                onSendWithoutScripts={again}
            />,
            { wrapper: AppProviders },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Send without scripts' }));

        expect(again).toHaveBeenCalledOnce();
        expect(screen.queryByText('antes de romper')).toBeNull();
        expect(consoleStore.getState().open).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'View in console' }));

        expect(consoleStore.getState().open).toBe(true);
    });

    it('offers no way without scripts when it was not a script that failed, but the console', () => {
        render(
            <SendStatus
                entry={{ error: 'request-timeout', sendId: SEND, state: 'failed' }}
                onSendWithoutScripts={vi.fn()}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.queryByRole('button', { name: 'Send without scripts' })).toBeNull();
        expect(screen.getByRole('button', { name: 'View in console' })).toBeVisible();
    });
});

describe('the marks of what the scripts changed on the way out', () => {
    const DONE = { response: httpResponse(), sendId: SEND, state: 'done' } as const;

    it('marks the scripts left out and a redirect held, and leaves a moved destination to the console', () => {
        told({
            skipped: [
                { name: 'altas', level: 'folder', event: 'onBeforeRequest', bytes: 4 },
                { name: 'pedidos', level: 'collection', event: 'onResponse', bytes: 4 },
            ],
            destinationMoved: true,
            heldAt: 'https://otro.example/',
        });
        render(<SendStatus entry={DONE} />, { wrapper: AppProviders });

        expect(screen.getByText('Sent without 2 unapproved scripts')).toBeVisible();
        expect(
            screen.queryByText('A script changed the destination: it left without secrets'),
        ).toBeNull();
        expect(
            screen.getByText('Redirect stopped: it carried a secret to another site'),
        ).toBeVisible();
    });

    it('marks nothing when the scripts changed nothing', () => {
        told({ logs: [{ level: 'log', text: 'hola' }] });
        render(<SendStatus entry={DONE} />, { wrapper: AppProviders });

        expect(document.querySelector('[data-part="script-mark"]')).toBeNull();
    });
});
