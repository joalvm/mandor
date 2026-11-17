import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MessageDescription } from '../../../../../../src/renderer/features/messages/components/strip/MessageDescription.js';

import { AppProviders } from '../../../../support/app-providers.js';

const RESOURCE = 'mandor://local/events/item/pedido-creado';

function draw(value: string) {
    const onChange = vi.fn();

    render(<MessageDescription onChange={onChange} resource={RESOURCE} value={value} />, {
        wrapper: AppProviders,
    });

    return onChange;
}

afterEach(cleanup);

describe('the description of a message', () => {
    it('opens on its page, read as a doc', () => {
        draw('# Pedido creado\n\nLlega al confirmar.\n');

        expect(screen.getByRole('heading', { level: 1, name: 'Pedido creado' })).toBeVisible();
    });

    it('offers to write a description that has nothing in it', () => {
        draw('');

        expect(screen.getByRole('button', { name: 'Write' })).toBeVisible();
    });

    it('hands out what is typed in its editor', async () => {
        const onChange = draw('Antes');

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        (await editorAt(0)).typeOver('Después');

        expect(screen.getByRole('group', { name: 'Description editor' })).toBeVisible();
        expect(onChange).toHaveBeenCalledWith('Después');
    });
});
