import { editorAt } from '@mandor/ui/testing/editors-in';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocDescription } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

const LABEL = 'Description';

function describeItem(modelKey: string, value: string) {
    const onChange = vi.fn();
    const shown = render(
        <DocDescription label={LABEL} modelKey={modelKey} onChange={onChange} value={value} />,
        { wrapper: AppProviders },
    );

    return {
        next: (key: string, text: string) => {
            shown.rerender(
                <DocDescription label={LABEL} modelKey={key} onChange={onChange} value={text} />,
            );
        },
        onChange,
    };
}

describe('the description of an item', () => {
    /** A description is read far more often than it is written. */
    it('opens on its page', () => {
        describeItem('item-1', '# Evento de pago\n\nLlega al confirmar.\n');

        expect(screen.getByRole('heading', { level: 1, name: 'Evento de pago' })).toBeVisible();
        expect(screen.queryByRole('group', { name: LABEL })).toBeNull();
    });

    it('is written in the same editor as a doc, and hands out what is typed', async () => {
        const { onChange } = describeItem('item-1', 'Antes');

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        (await editorAt(0)).typeOver('Después');

        expect(screen.getByRole('group', { name: LABEL })).toBeVisible();
        expect(onChange).toHaveBeenCalledWith('Después');
    });

    it('offers to write a description that has nothing in it', async () => {
        describeItem('item-1', '');

        fireEvent.click(screen.getByRole('button', { name: 'Write' }));

        expect((await editorAt(0)).text()).toBe('');
    });

    /** The strip stays when another item is picked, and that item opens on its own page. */
    it('opens the next item on its page, whichever side the last one was on', async () => {
        const { next } = describeItem('item-1', 'Antes');

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await editorAt(0);
        next('item-2', '# Otro evento\n');

        expect(screen.getByRole('heading', { level: 1, name: 'Otro evento' })).toBeVisible();
        expect(screen.queryByRole('group', { name: LABEL })).toBeNull();
    });

    it('goes back to the page from the editor', async () => {
        describeItem('item-1', '# Evento\n');

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await editorAt(0);
        fireEvent.click(screen.getByRole('button', { name: 'View' }));

        expect(screen.getByRole('heading', { level: 1, name: 'Evento' })).toBeVisible();
    });
});
