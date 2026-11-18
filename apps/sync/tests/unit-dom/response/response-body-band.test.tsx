import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ResponseBodyBand,
    type ResponseBodyActions,
} from '../../../src/renderer/response/ResponseBodyBand.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

function actions(over: Partial<ResponseBodyActions> = {}): ResponseBodyActions {
    return {
        copy: vi.fn(),
        loadMore: vi.fn(),
        save: vi.fn(),
        setFormat: vi.fn(),
        setPreview: vi.fn(),
        setWrap: vi.fn(),
        ...over,
    };
}

type Show = { preview?: boolean | null; wrap?: boolean | null };

type Progress = { laidOut?: boolean; loaded?: number; total?: number };

function draw(acts: ResponseBodyActions, progress: Progress = {}, show: Show = {}): void {
    render(
        <ResponseBodyBand
            actions={acts}
            progress={{ laidOut: true, loaded: 10, total: 10, ...progress }}
            show={{
                format: 'json',
                preview: show.preview ?? null,
                wrap: show.wrap === undefined ? true : show.wrap,
            }}
        />,
        { wrapper: AppProviders },
    );
}

describe('the band of ResponseBodyBand over a body, with its BodyFormatMenu', () => {
    it('is as tall as a toolbar, so its controls fit', () => {
        draw(actions());

        expect(document.querySelector('[data-part="response-body-band"]')).toHaveClass('h-section');
    });

    it('names the format on screen and offers the others, languages first', async () => {
        const acts = actions();

        draw(acts);

        const format = screen.getByRole('button', { name: 'Body format: JSON' });

        fireEvent.pointerDown(format, { button: 0, ctrlKey: false });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Base64' }));

        await waitFor(() => {
            expect(acts.setFormat).toHaveBeenCalledWith('base64');
        });
    });

    it('offers the preview only for what can be drawn, and says when it is on', () => {
        const acts = actions();

        draw(acts);

        expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull();

        cleanup();
        draw(acts, {}, { preview: false });
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

        expect(acts.setPreview).toHaveBeenCalledWith(true);

        cleanup();
        draw(acts, {}, { preview: true });

        expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('wraps long lines on a switch, and has none where there are no lines', () => {
        const acts = actions();

        draw(acts);
        fireEvent.click(screen.getByRole('button', { name: 'Wrap long lines' }));

        expect(acts.setWrap).toHaveBeenCalledWith(false);

        cleanup();
        draw(acts, {}, { wrap: null });

        expect(screen.queryByRole('button', { name: 'Wrap long lines' })).toBeNull();
    });

    it('copies and saves through what it was given', () => {
        const acts = actions();

        draw(acts);
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save…' }));

        expect(acts.copy).toHaveBeenCalledTimes(1);
        expect(acts.save).toHaveBeenCalledTimes(1);
    });

    it('has no copy when there is nothing on screen to copy', () => {
        draw(actions({ copy: null }));

        expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
    });

    it('says how much is in and asks for more only while the body is partial', () => {
        const acts = actions();

        draw(acts, { loaded: 262_144, total: 3_145_728 });
        fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

        expect(acts.loadMore).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[data-part="response-body-band"]')).toHaveTextContent('of');
    });

    it('says when the body was too big to lay out', () => {
        draw(actions(), { laidOut: false });

        expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
        expect(document.querySelector('[data-part="response-body-band"]')).toHaveTextContent(
            /too large/i,
        );
    });
});
