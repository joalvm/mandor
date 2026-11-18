import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '../../src/index.js';

function sections(value: string, onValueChange = vi.fn()): ReactElement {
    return (
        <Tabs onValueChange={onValueChange} value={value}>
            <TabsStrip>
                <TabsList label="Secciones">
                    <TabsTab label="Descripción" value="description" />
                    <TabsTab label="Payload" value="payload" />
                </TabsList>
            </TabsStrip>
            <TabsPanel value="description">
                <p>Lo que hace</p>
            </TabsPanel>
            <TabsPanel value="payload">
                <p>Lo que se envía</p>
            </TabsPanel>
        </Tabs>
    );
}

function show(value: string, onValueChange = vi.fn()): ReturnType<typeof vi.fn> {
    render(sections(value, onValueChange));

    return onValueChange;
}

describe('the sections of a panel', () => {
    it('shows the one section that was chosen', () => {
        show('payload');

        expect(screen.getByRole('tab', { name: 'Payload', selected: true })).toBeVisible();
        expect(screen.getByText('Lo que se envía')).toBeVisible();
    });

    /**
     * A section holds an editor, and the draft of an editor lives in the editor. Taking the
     * section away once it has been open would take what somebody wrote in it. One nobody has
     * opened holds nothing yet, and is not drawn: a window with many tabs builds no editor
     * nobody looks at.
     */
    it('draws a section the first time it opens, and keeps it after', () => {
        const { rerender } = render(sections('payload'));

        expect(screen.queryByText('Lo que hace')).toBeNull();

        rerender(sections('description'));

        expect(screen.getByText('Lo que hace')).toBeVisible();

        rerender(sections('payload'));

        expect(screen.getByText('Lo que hace')).not.toBeVisible();
    });

    it('reports the section that was asked for instead of moving on its own', () => {
        const onValueChange = show('payload');

        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Descripción' }));

        expect(onValueChange).toHaveBeenCalledWith('description');
        expect(screen.getByRole('tab', { name: 'Payload', selected: true })).toBeVisible();
    });

    /** The arrow moves the focus, and the section under the focus is the one that opens. */
    it('walks the sections with the arrow keys', async () => {
        const onValueChange = show('payload');

        fireEvent.keyDown(screen.getByRole('tab', { name: 'Payload' }), { key: 'ArrowLeft' });

        await waitFor(() => {
            expect(onValueChange).toHaveBeenCalledWith('description');
        });
    });

    /** The actions of the panel live beside the sections, not inside a section of their own. */
    it('draws what applies to the panel in the strip and outside the list', () => {
        render(
            <Tabs onValueChange={vi.fn()} value="payload">
                <TabsStrip>
                    <TabsList label="Secciones">
                        <TabsTab label="Payload" value="payload" />
                    </TabsList>
                    <Button>Enviar</Button>
                </TabsStrip>
            </Tabs>,
        );

        expect(screen.getByRole('button', { name: 'Enviar' })).toBeVisible();
        expect(screen.getByRole('tablist').textContent).not.toContain('Enviar');
    });

    /** The band of sections does not close: the hairline between band and body is gone. */
    it('opens the strip into the body without a hairline of its own', () => {
        show('payload');

        const strip = screen.getByRole('tablist').closest('[data-part="tabs-strip"]');

        expect(strip).not.toBeNull();
        expect(strip).not.toHaveClass('border-b');
    });

    it('marks a dirty section with a dot, and stays quiet on a clean one', () => {
        render(
            <Tabs onValueChange={vi.fn()} value="payload">
                <TabsStrip>
                    <TabsList label="Secciones">
                        <TabsTab dirty label="Descripción" value="description" />
                        <TabsTab label="Payload" value="payload" />
                    </TabsList>
                </TabsStrip>
            </Tabs>,
        );

        expect(screen.getByRole('tab', { name: 'Descripción' })).toHaveAttribute('data-dirty');
        expect(screen.getByRole('tab', { name: 'Payload' })).not.toHaveAttribute('data-dirty');
    });
});

describe('what a section says before it is opened', () => {
    function strip(props: {
        broken?: boolean;
        children?: ReactNode;
        count?: number;
        dirty?: boolean;
        filled?: boolean;
    }): void {
        render(
            <Tabs onValueChange={vi.fn()} value="a">
                <TabsStrip>
                    <TabsList label="Secciones">
                        <TabsTab label="Cabeceras" value="a" {...props} />
                    </TabsList>
                </TabsStrip>
                <TabsPanel value="a">
                    <p>Contenido</p>
                </TabsPanel>
            </Tabs>,
        );
    }

    it('shows the count after the name, and nothing for zero', () => {
        strip({ count: 14 });

        expect(screen.getByRole('tab', { name: /Cabeceras/u })).toHaveTextContent('14');
    });

    it('draws no count when the section is empty', () => {
        strip({ count: 0 });

        expect(screen.queryByText('0')).toBeNull();
    });

    it('marks a section that has content but nothing to count', () => {
        strip({ filled: true });

        expect(document.querySelector('[data-part="tabs-filled"]')).not.toBeNull();
    });

    it('lets the unsent dot win over the quiet one', () => {
        strip({ dirty: true, filled: true });

        expect(document.querySelector('[data-part="tabs-dirty"]')).not.toBeNull();
        expect(document.querySelector('[data-part="tabs-filled"]')).toBeNull();
    });

    it('lets the dot of something wrong win over the unsent one and the quiet one', () => {
        strip({ broken: true, dirty: true, filled: true });

        expect(screen.getByRole('tab', { name: /Cabeceras/u })).toHaveAttribute('data-broken');
        expect(document.querySelector('[data-part="tabs-broken"]')).not.toBeNull();
        expect(document.querySelector('[data-part="tabs-dirty"]')).toBeNull();
        expect(document.querySelector('[data-part="tabs-filled"]')).toBeNull();
    });

    it('shows what the section brings of its own at the end, after the name and the count', () => {
        strip({ children: <span>Girando</span>, count: 3 });

        const tab = screen.getByRole('tab', { name: /Cabeceras/u });
        const mark = tab.querySelector('[data-part="tabs-tab-mark"]');

        expect(mark).toHaveTextContent('Girando');
        expect(tab.lastElementChild).toBe(mark);
    });

    it('keeps no slot for a section that brings nothing', () => {
        strip({ children: false });

        expect(document.querySelector('[data-part="tabs-tab-mark"]')).toBeNull();
    });

    /** The strip spends its width on names: no room is kept for a dot that is not there. */
    it('keeps no room after the name of a section with nothing to mark', () => {
        strip({});

        expect(document.querySelector('[data-part="tabs-mark"]')).toBeNull();
    });
});
