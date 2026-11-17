import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TabsOverflow } from '../../../src/components/tabs/TabsOverflow.js';
import { TooltipProvider } from '../../../src/index.js';

/** A section as the list draws it, with what the menu reads off it. */
function section(value: string, label: string, extra: Record<string, string> = {}): HTMLElement {
    const element = document.createElement('button');

    Object.assign(element.dataset, { label, value, ...extra });
    document.body.append(element);

    return element;
}

function openFrom(label: string): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: label }), {
        button: 0,
        ctrlKey: false,
    });
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

describe('the menu of the sections left out of view', () => {
    it('is not there while every section fits', () => {
        render(<TabsOverflow hidden={[]} label="Secciones" onChoose={vi.fn()} />);

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('lists them with their count and their dot, and opens the one chosen', async () => {
        const headers = section('headers', 'Cabeceras', { count: '3', dirty: '' });
        const auth = section('auth', 'Autorización');
        const choose = vi.fn();

        render(
            <TooltipProvider>
                <TabsOverflow hidden={[headers, auth]} label="Secciones" onChoose={choose} />
            </TooltipProvider>,
        );
        openFrom('Secciones');

        const line = await screen.findByRole('menuitem', { name: /Cabeceras/ });

        expect(line).toHaveTextContent('Cabeceras3');
        expect(line.querySelector('[data-part="tabs-dirty"]')).not.toBeNull();
        expect(screen.getByRole('menuitem', { name: 'Autorización' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('menuitem', { name: 'Autorización' }));

        expect(choose).toHaveBeenCalledWith('auth');
    });
});
