import { registerSurface } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SendResponse } from '../../../../src/renderer/features/requests/components/response/SendResponse.js';
import { answerVerdict } from '../../../../src/renderer/features/requests/lib/compare/answer-verdict.js';
import type { SendEntry } from '../../../../src/renderer/features/requests/responses.slice.js';
import { AppProviders } from '../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

afterEach(cleanup);

function draw(entry: SendEntry, onClear = vi.fn()): void {
    render(<SendResponse entry={entry} onClear={onClear} resource="r1" />, {
        wrapper: AppProviders,
    });
}

/** Opens the menu behind the dots at the end of the strip. */
function openMore(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions' }), {
        button: 0,
        ctrlKey: false,
    });
}

function summary(): Element | null {
    return document.querySelector('[data-part="response-summary"]');
}

describe('the response beside a request, with its ResponseActions', () => {
    it('asks to send before anything was sent', () => {
        draw({ state: 'idle' });

        expect(screen.getByText('Send the request to see its response here.')).toBeVisible();
        expect(screen.queryByRole('tab')).toBeNull();
        expect(summary()).toHaveAttribute('data-state', 'idle');
    });

    it('says it is sending while the answer is on its way', () => {
        draw({ sendId: '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11', state: 'sending' });

        expect(screen.getByRole('status')).toHaveTextContent('Sending…');
        expect(summary()).toHaveAttribute('data-state', 'sending');
    });

    it('says why the send ended, in red, and shows no response under it', () => {
        draw({ error: 'request-timeout', state: 'failed' });

        expect(screen.getByRole('status')).toHaveTextContent('The server did not answer in time.');
        expect(screen.queryByText('HTTP/2')).toBeNull();
        expect(summary()).toHaveAttribute('data-fault', 'true');
    });

    it('says the request was cancelled in the words of the error, without the red', () => {
        draw({ error: 'request-aborted', state: 'failed' });

        expect(screen.getByRole('status')).toHaveTextContent(
            'The request was cancelled before it finished.',
        );
        expect(summary()).toHaveAttribute('data-fault', 'false');
    });

    it('draws the answer with the views of a response once the send is done', () => {
        draw({ response: httpResponseWith({ status: 201 }), state: 'done' });

        expect(screen.getByText('201')).toBeVisible();
        expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('offers the way to the history from an answer, and from a send that failed', async () => {
        const open = vi.fn();
        const unregister = registerSurface({ id: 'history', open });

        draw({ response: httpResponseWith(), state: 'done' });
        openMore();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'View in history' }));
        cleanup();
        draw({ error: 'request-timeout', state: 'failed' });
        fireEvent.click(screen.getByRole('button', { name: 'View in history' }));
        unregister();

        await waitFor(() => {
            expect(open).toHaveBeenCalledTimes(2);
        });
    });

    it('lets the answer go from behind the dots, and leaves keeping it to the bar', async () => {
        const onClear = vi.fn();

        draw({ response: httpResponseWith(), state: 'done' }, onClear);
        openMore();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Clear response' }));

        expect(screen.queryByRole('button', { name: 'Save response' })).toBeNull();
        await waitFor(() => {
            expect(onClear).toHaveBeenCalledOnce();
        });
    });

    it('has no way to the history while nobody has built it, and breaks nothing', () => {
        draw({ error: 'request-timeout', state: 'failed' });

        expect(() => {
            fireEvent.click(screen.getByRole('button', { name: 'View in history' }));
        }).not.toThrow();
    });

    it('adds the schema of the example the answer stands for, marked when it broke a rule', () => {
        const response = httpResponseWith({ body: textBody('{"id":1}') });
        const text = '{"properties": {"id": {"type": "string"}}}';
        const onGenerate = vi.fn();

        render(
            <SendResponse
                entry={{ response, state: 'done' }}
                onClear={vi.fn()}
                resource="r1"
                schema={{
                    chosen: 'ok',
                    examples: [
                        { key: 'ok', name: 'Lista' },
                        { key: 'campos', name: 'Con campos' },
                    ],
                    issues: answerVerdict(text, response)?.issues ?? [],
                    judged: '{"id":1}',
                    modelKey: 'mandor://r1/ok#schema',
                    onChange: vi.fn(),
                    onChoose: vi.fn(),
                    onGenerate,
                    text,
                }}
            />,
            { wrapper: AppProviders },
        );

        const tab = screen.getByRole('tab', { name: /^Schema/u });

        expect(tab).toHaveTextContent(/^Schema$/u);
        expect(tab.querySelector('[data-part="tabs-broken"]')).not.toBeNull();

        fireEvent.mouseDown(tab);

        expect(screen.getByRole('region', { name: 'Received 200 · 1 problem' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Example of the schema' })).toHaveTextContent(
            'Lista',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Generate from the response' }));

        expect(onGenerate).toHaveBeenCalledOnce();
    });

    it('has no section of the schema when no example has the status that came', () => {
        draw({ response: httpResponseWith({ status: 404 }), state: 'done' });

        expect(screen.queryByRole('tab', { name: /^Schema/u })).toBeNull();
    });
});
