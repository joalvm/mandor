import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { byPart } from '../../src/testing/by-part.js';

import { AppBody, AppShell, SidePanel, StatusBar, TitleBar, Workbench } from '../../src/index.js';

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

        expect(titlebar).toHaveClass('pl-pad-panel');
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
});
