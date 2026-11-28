import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { byPart } from '../../src/testing/by-part.js';

import {
    AppBody,
    AppShell,
    Card,
    SidePanel,
    StatusBar,
    Tabs,
    TabsList,
    TabsStrip,
    TabsTab,
    TextDirection,
    TitleBar,
    Workbench,
} from '../../src/index.js';

/**
 * The zones say where the window is divided and nothing about what fills it: every one of them
 * takes `children` and the app writes the tree. What is worth holding still is that each leaves
 * the part a stylesheet and a test can find it by, and that the geometry a zone owns —how tall
 * a band is, how wide the lateral was dragged— stays with the zone.
 */
describe('the zones of the window', () => {
    it('stacks the window from the title row down to the status row', () => {
        render(
            <AppShell>
                <TitleBar>
                    <span>Mandor</span>
                </TitleBar>
                <AppBody>
                    <SidePanel width={280}>
                        <span>connections</span>
                    </SidePanel>
                    <Workbench>
                        <span>a group of tabs</span>
                    </Workbench>
                </AppBody>
                <StatusBar>
                    <span>ready</span>
                </StatusBar>
            </AppShell>,
        );

        const shell = byPart('app-shell');

        expect(shell).toContainElement(byPart('titlebar'));
        expect(shell).toContainElement(byPart('app-body'));
        expect(shell).toContainElement(byPart('status-bar'));
        expect(byPart('app-body')).toContainElement(byPart('sidebar'));
        expect(byPart('app-body')).toContainElement(byPart('workbench'));
        expect(screen.getByText('a group of tabs')).toBeVisible();
    });

    /**
     * The window buttons reach the corner on every platform, so the row opens with air and
     * closes flush. A symmetric padding would leave a strip of window that refuses to close.
     */
    it('opens the title row with padding and closes it flush', () => {
        render(
            <TitleBar>
                <span>menus</span>
            </TitleBar>,
        );

        const titlebar = byPart('titlebar');

        expect(titlebar).toHaveClass('ps-pad-panel');
        expect(titlebar).not.toHaveClass('px-pad-panel');
        expect(titlebar).toHaveClass('h-titlebar');
    });

    /** The width travels as an attribute: `runtime.css` resolves it, the JSX never repeats it. */
    it('hands the width of the lateral to the stylesheet', () => {
        render(
            <SidePanel width={312}>
                <span>collection</span>
            </SidePanel>,
        );

        expect(byPart('sidebar')).toHaveAttribute('data-width', '312px');
    });

    /**
     * The work rests on a card above the frame: rounded by the step of a panel, in the tone of a
     * card, holding what it is given and nothing of its own. Named, it is a zone a screen reader
     * can land on; unnamed, it stays a plain box around the body of a tab.
     */
    it('draws the work on a card that holds its children', () => {
        render(
            <Workbench>
                <Card aria-label="console">
                    <span>a line of the log</span>
                </Card>
            </Workbench>,
        );

        const card = byPart('card');

        expect(byPart('workbench')).toContainElement(card);
        expect(card).toHaveClass('rounded-panel', 'bg-surface-card');
        expect(card).toContainElement(screen.getByText('a line of the log'));
        expect(screen.getByRole('region', { name: 'console' })).toBe(card);
    });

    /**
     * A card fills what is left of its column by default; one told to measure its contents keeps
     * its own height, so the pair below it shares the rest.
     */
    it('fills its column unless it is told to keep the height of its contents', () => {
        render(
            <Workbench>
                <Card aria-label="target" size="content">
                    <span>the address</span>
                </Card>
                <Card aria-label="body">
                    <span>the body</span>
                </Card>
            </Workbench>,
        );

        const target = screen.getByRole('region', { name: 'target' });
        const body = screen.getByRole('region', { name: 'body' });

        expect(target).toHaveClass('shrink-0');
        expect(target).not.toHaveClass('flex-1', 'h-full');
        expect(body).toHaveClass('flex-1', 'h-full');
        expect(body).not.toHaveClass('shrink-0');
    });

    /**
     * In a language written from the right, the tab after the current one sits on its left: the
     * arrow that points at it is the one that gets there.
     */
    it('moves through the tabs the way the text of the window runs', async () => {
        render(
            <TextDirection dir="rtl">
                <Tabs onValueChange={() => undefined} value="headers">
                    <TabsStrip>
                        <TabsList label="Secciones">
                            <TabsTab label="Descripción" value="description" />
                            <TabsTab label="Headers" value="headers" />
                            <TabsTab label="Payload" value="payload" />
                        </TabsList>
                    </TabsStrip>
                </Tabs>
            </TextDirection>,
        );

        const current = screen.getByRole('tab', { name: 'Headers' });

        act(() => {
            current.focus();
        });
        fireEvent.keyDown(current, { key: 'ArrowLeft' });

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Payload' })).toHaveFocus();
        });
    });
});
