import { success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../src/renderer/app/sync-bridge.js';
import { ResponseBody } from '../../../src/renderer/response/ResponseBody.js';
import { ResponsePanel } from '../../../src/renderer/response/ResponsePanel.js';
import { AppProviders } from '../support/app-providers.js';
import { httpResponseWith, stubClipboard, textBody } from '../support/http-response.js';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    stubClipboard(writeText);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function drawBody(body: unknown, contentType: string): void {
    const response = httpResponseWith({ body, headers: [['content-type', contentType]] });

    render(<ResponseBody resource="r1" response={response} />, { wrapper: AppProviders });
}

function part(name: string): Element | null {
    return document.querySelector(`[data-part="${name}"]`);
}

function band(): HTMLElement {
    return part('response-body-band') as HTMLElement;
}

function preview(): void {
    fireEvent.click(within(band()).getByRole('button', { name: 'Preview' }));
}

describe('the body of a response', () => {
    it('says the server sent none instead of drawing an empty editor', () => {
        drawBody(null, 'text/plain');

        expect(screen.getByText('No body')).toBeVisible();
        expect(part('response-body-band')).toBeNull();
    });

    it('reads json in the editor, in its own format, and draws it as a table on asking', async () => {
        drawBody(textBody('{"a":1}'), 'application/json');

        await waitFor(() => {
            expect(part('code-editor')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: 'Body format: JSON' })).toBeVisible();

        preview();

        expect(part('response-json')).toHaveTextContent('a1');
    });

    it('opens binary as a dump it cannot draw, and offers nothing to copy', () => {
        drawBody({ data: 'AAEC', encoding: 'base64', kind: 'inline' }, 'application/octet-stream');

        expect(part('hex-view')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Body format: Hex' })).toBeVisible();
        expect(within(band()).queryByRole('button', { name: 'Preview' })).toBeNull();
        expect(within(band()).queryByRole('button', { name: 'Copy' })).toBeNull();
        expect(within(band()).getByRole('button', { name: 'Save…' })).toBeVisible();
    });

    it('shows an image as an image once the whole body is in', () => {
        drawBody({ data: 'AQID', encoding: 'base64', kind: 'inline' }, 'image/png');

        expect(screen.getByRole('img', { name: 'Image in the response' })).toHaveAttribute(
            'src',
            'data:image/png;base64,AQID',
        );
    });

    it('previews a page in a frame with no permissions', () => {
        drawBody(textBody('<h1>hola</h1>'), 'text/html');

        preview();

        const frame = screen.getByTitle('Page in the response');

        expect(frame).toHaveAttribute('sandbox', '');
        expect(frame).toHaveAttribute('srcdoc', '<h1>hola</h1>');
    });

    it('copies the text on screen', async () => {
        drawBody(textBody('plain words'), 'text/plain');

        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

        expect(writeText).toHaveBeenCalledWith('plain words');
        await waitFor(() => {
            expect(screen.getByText('Copied')).toBeVisible();
        });
    });

    it('saves it and says so, and stays quiet when the dialog is closed', async () => {
        const save = vi
            .spyOn(syncBridge.request, 'saveBody')
            .mockResolvedValueOnce(success({ path: 'C:/x/out.txt' }))
            .mockResolvedValueOnce(success({ path: null }));

        drawBody(textBody('plain words'), 'text/plain');

        fireEvent.click(screen.getByRole('button', { name: 'Save…' }));

        await waitFor(() => {
            expect(screen.getByText('Saved')).toBeVisible();
        });
        expect(save).toHaveBeenCalledTimes(1);
    });
});

describe('the panel of a response', () => {
    it('offers body, cookies and headers, and moves between them', () => {
        const response = httpResponseWith({ body: textBody('x'), headers: [['x-id', '7']] });

        render(<ResponsePanel resource="r1" response={response} />, {
            wrapper: AppProviders,
        });

        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
            'Body',
            'Cookies',
            'Headers1',
        ]);

        fireEvent.mouseDown(screen.getByRole('tab', { name: /^Headers/u }));
        fireEvent.click(screen.getByRole('tab', { name: /^Headers/u }));

        expect(screen.getByText('x-id')).toBeVisible();
    });

    it('opens again on the section it was left on, apart from the sections of the request', () => {
        const response = httpResponseWith({ body: textBody('x'), headers: [['x-id', '7']] });

        shellStore.getState().reset();
        render(<ResponsePanel resource="r1" response={response} />, { wrapper: AppProviders });
        fireEvent.mouseDown(screen.getByRole('tab', { name: /^Headers/u }));
        fireEvent.click(screen.getByRole('tab', { name: /^Headers/u }));
        cleanup();
        render(<ResponsePanel resource="r1" response={response} />, { wrapper: AppProviders });

        expect(screen.getByRole('tab', { name: /^Headers/u })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(shellStore.getState().sections['r1']).toBeUndefined();
    });

    it('reads no store: what it is given is what it draws, with what is put inside at the end', () => {
        const response = httpResponseWith({ status: 404 });

        render(
            <ResponsePanel resource="r1" response={response}>
                <span>link</span>
            </ResponsePanel>,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('404')).toBeVisible();
        expect(screen.getByText('link')).toBeVisible();
    });
});
