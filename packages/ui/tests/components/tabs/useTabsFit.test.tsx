import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tabs, TabsList, TabsStrip, TabsTab, TooltipProvider } from '../../../src/index.js';

const SECTIONS = [
    ['params', 'Parámetros'],
    ['headers', 'Cabeceras'],
    ['body', 'Cuerpo'],
    ['auth', 'Autorización'],
] as const;

/** Where each section starts: four of 80 side by side, in a list 170 wide. */
const STARTS: Record<string, number> = { auth: 240, body: 160, headers: 80, params: 0 };

function strip(value: string, onValueChange = vi.fn()): ReactElement {
    return (
        <TooltipProvider>
            <Tabs onValueChange={onValueChange} value={value}>
                <TabsStrip>
                    <TabsList label="Secciones">
                        {SECTIONS.map(([id, label]) => (
                            <TabsTab key={id} label={label} value={id} />
                        ))}
                    </TabsList>
                </TabsStrip>
            </Tabs>
        </TooltipProvider>
    );
}

async function offered(): Promise<string[]> {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Secciones' }), {
        button: 0,
        ctrlKey: false,
    });

    const lines = await screen.findAllByRole('menuitem');

    return lines.map((line) => line.textContent);
}

function valueOf(element: HTMLElement): string {
    return element.dataset['value'] ?? '';
}

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
        this: HTMLElement,
    ) {
        return STARTS[valueOf(this)] ?? 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
        this: HTMLElement,
    ) {
        return valueOf(this) === '' ? 0 : 80;
    });
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
        return this.getAttribute('data-part') === 'tabs-list' ? 170 : 0;
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('useTabsFit, the sections a strip has no room for', () => {
    it('does not draw a section cut at the edge, whose name would read as another', () => {
        render(strip('params'));

        expect(
            screen.getAllByRole('tab').map((tab) => tab.hasAttribute('data-out-of-view')),
        ).toEqual([false, false, true, true]);
    });

    it('offers what does not fit in a menu named like the list, and keeps it in the list', async () => {
        render(strip('params'));

        expect(screen.getAllByRole('tab')).toHaveLength(4);
        await expect(offered()).resolves.toEqual(['Cuerpo', 'Autorización']);
    });

    it('opens the section chosen in the menu', async () => {
        const open = vi.fn();

        render(strip('params', open));
        await offered();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Cuerpo' }));

        expect(open).toHaveBeenCalledWith('body');
    });

    it('offers nothing when every section fits', () => {
        vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(400);
        render(strip('params'));

        expect(screen.queryByRole('button', { name: 'Secciones' })).toBeNull();
    });

    it('scrolls the list to keep the open section in view, leaving the first ones out', async () => {
        render(strip('auth'));

        await expect(offered()).resolves.toEqual(['Parámetros', 'Cabeceras']);
    });
});
