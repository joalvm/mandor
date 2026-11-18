import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NoticeRow } from '../../../src/components/notice-center/NoticeRow.js';
import type { Notice } from '../../../src/notices.slice.js';

const NOW = 1_700_000_000_000;

function notice(overrides: Partial<Notice> = {}): Notice {
    return {
        at: NOW,
        count: 1,
        id: 'a',
        key: 'a',
        read: false,
        title: 'No se pudo guardar',
        tone: 'error',
        ...overrides,
    };
}

function draw(shown: Notice, onDismiss = vi.fn()) {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ul>
                    <NoticeRow notice={shown} now={NOW} onDismiss={onDismiss} />
                    <li data-testid="next" tabIndex={0} />
                </ul>
            </TooltipProvider>
        </MessagesProvider>,
    );

    return onDismiss;
}

afterEach(() => {
    cleanup();
});

describe('a row of the notice centre', () => {
    it('says what went wrong, how many times and the way out its owner offered', () => {
        const onSelect = vi.fn();

        draw(
            notice({
                action: { label: 'Reintentar', onSelect },
                count: 3,
                detail: 'El disco está lleno',
            }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(screen.getByText('No se pudo guardar')).toBeVisible();
        expect(screen.getByText('×3')).toBeVisible();
        expect(screen.getByText('El disco está lleno')).toBeVisible();
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('is told apart by its tone', () => {
        draw(notice({ tone: 'warning' }));

        expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-tone', 'warning');
    });

    it('is dismissed by its button and by Delete, which moves the focus to the neighbour', () => {
        const onDismiss = draw(notice());
        const row = screen.getAllByRole('listitem')[0] ?? document.body;

        fireEvent.click(screen.getByRole('button', { name: 'Borrar aviso' }));
        fireEvent.keyDown(row, { key: 'Delete' });

        expect(onDismiss).toHaveBeenCalledTimes(2);
        expect(onDismiss).toHaveBeenCalledWith('a');
        expect(screen.getByTestId('next')).toHaveFocus();
    });
});
