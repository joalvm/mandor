import { envStore } from '@mandor/env';
import type { RequestLine } from '@mandor/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestPairs } from '../../../../src/renderer/features/requests/components/pairs/RequestPairs.js';
import { AppProviders } from '../../support/app-providers.js';

const QUERY: RequestLine[] = [
    { enabled: true, key: 'room', value: '1' },
    {
        description: 'sin uso',
        enabled: false,
        key: 'draft',
        meta: { type: 'integer' },
        value: 'x',
    },
];

function draw(onChange: (query: RequestLine[]) => void): void {
    render(
        <RequestPairs
            environment={undefined}
            lines={QUERY}
            onChange={onChange}
            onVariablesChange={() => undefined}
            title="Params"
        />,
        {
            wrapper: AppProviders,
        },
    );
}

afterEach(() => {
    cleanup();
    envStore.getState().reset();
});

describe('the params table of a request', () => {
    it('draws the query as rows, the type of a pair on them, and the empty row that spawns one more', () => {
        draw(() => undefined);

        expect(screen.getAllByRole('textbox', { name: 'Key' })).toHaveLength(3);

        const checks = screen.getAllByRole('checkbox', { name: 'Send this entry' });

        expect(checks[0]).toBeChecked();
        expect(checks[1]).not.toBeChecked();
        expect(screen.getByText('integer')).toBeVisible();
    });

    it('writes the table back into the query, what the document gave the row travelling by identity', () => {
        const onChange = vi.fn();

        draw(onChange);

        const keys = screen.getAllByRole('textbox', { name: 'Key' });
        const ghost = keys[2];

        if (ghost === undefined) {
            throw new Error('the empty row is not there');
        }

        fireEvent.focus(ghost);
        ghost.textContent = 'token';
        fireEvent.input(ghost);

        expect(onChange).toHaveBeenCalledWith([
            expect.objectContaining({ enabled: true, key: 'room', value: '1' }),
            expect.objectContaining({
                description: 'sin uso',
                enabled: false,
                key: 'draft',
                meta: { type: 'integer' },
                value: 'x',
            }),
            expect.objectContaining({ enabled: true, key: 'token', value: '' }),
        ]);
    });

    it('switches a pair off with its checkbox, and the send leaves it out', () => {
        const onChange = vi.fn();

        draw(onChange);

        const checks = screen.getAllByRole('checkbox', { name: 'Send this entry' });
        const first = checks[0];

        if (first === undefined) {
            throw new Error('the checkbox is not there');
        }

        fireEvent.click(first);

        expect(onChange).toHaveBeenCalledWith([
            expect.objectContaining({ enabled: false, key: 'room' }),
            expect.objectContaining({ enabled: false, key: 'draft' }),
        ]);
    });
});
