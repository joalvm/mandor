import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExampleDiffBar } from '../../../../../../src/renderer/features/requests/components/examples/ExampleDiffBar.js';
import { compareExample } from '../../../../../../src/renderer/features/requests/lib/compare/compare-example.js';
import { AppProviders } from '../../../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../../../support/http-response.js';

afterEach(cleanup);

const EXAMPLE = {
    body: '{"id":1}',
    contentType: 'application/json',
    name: 'Creado',
    status: '201',
};

function draw(status: number, body: string, onAccept?: () => void, onWrap = vi.fn()): void {
    const response = httpResponseWith({ body: textBody(body), status, statusText: 'x' });

    render(
        <ExampleDiffBar
            comparison={compareExample(EXAMPLE, response)}
            example={EXAMPLE}
            onAccept={onAccept}
            onWrap={onWrap}
            wrap
        />,
        { wrapper: AppProviders },
    );
}

describe('the band over the lines of a comparison (ExampleDiffBar)', () => {
    it('says what came, with the time it took', () => {
        draw(201, '{"id":1}');

        expect(screen.getByText('Received')).toBeVisible();
        expect(screen.getByText('201')).toBeVisible();
        expect(screen.getByText(/100 ms/u)).toBeVisible();
    });

    it('says what was expected only when the status differs', () => {
        draw(200, '{"id":1}');

        expect(screen.getByText('(expected 201)')).toBeVisible();
    });

    it('says nothing of the status that matches', () => {
        draw(201, '{"id":2}');

        expect(screen.queryByText(/^\(expected/u)).toBeNull();
    });

    it('offers to take the received answer as the example when the values differ', () => {
        const onAccept = vi.fn();

        draw(201, '{"id":2}', onAccept);
        fireEvent.click(screen.getByRole('button', { name: 'Accept received' }));

        expect(onAccept).toHaveBeenCalledOnce();
    });

    it('offers it when only the status differs, and not when nothing does', () => {
        draw(200, '{"id":1}', vi.fn());

        expect(screen.queryByRole('button', { name: 'Accept received' })).not.toBeNull();

        cleanup();
        draw(201, '{"id":1}', vi.fn());

        expect(screen.queryByRole('button', { name: 'Accept received' })).toBeNull();
    });

    it('names its buttons by what they do, since they are icons', () => {
        draw(201, '{"id":2}', vi.fn());

        expect(screen.getByRole('button', { name: 'Accept received' }).textContent).toBe('');
    });

    it('turns the wrapping of long lines off and on', () => {
        const onWrap = vi.fn();

        draw(201, '{"id":2}', undefined, onWrap);
        fireEvent.click(screen.getByRole('button', { name: 'Wrap long lines' }));

        expect(onWrap).toHaveBeenCalledWith(false);
    });

    it('draws no button when nobody listens', () => {
        draw(201, '{"id":2}');

        expect(screen.queryByRole('button', { name: 'Accept received' })).toBeNull();
    });
});
