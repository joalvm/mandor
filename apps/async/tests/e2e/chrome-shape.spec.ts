import { rm } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { scaleTokenValues } from '../../../../packages/ui/src/styles/token-scale-values.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

/** A URL nothing answers on. The tab is here to be measured, never to be dialled. */
const NOWHERE = 'wss://127.0.0.1:9/socket';

/** The bands of the chrome, each one named by the part it plays in the window. */
const CHROME = ['titlebar', 'sidebar', 'status-bar'];

/** A tab is rounded by one step of the scale: the same corner every strip of the window takes. */
const ROUNDED = scaleTokenValues['mandor-radius-md'];

type TabShape = { bordered: boolean; name: string; pill: boolean; radius: string };

type Skin = { app: string; chrome: Record<string, string>; panel: string; workbench: string };

/**
 * The shape of every tab on screen, measured on what the browser resolved rather than on the
 * classes that asked for it. A tab can carry the right token and still come out square: a value
 * handed to a foreign library through a variable it does not read leaves no trace in the source,
 * only in the pixels, and the tabs of the window are drawn by one such library.
 */
async function tabShapes(page: Page): Promise<TabShape[]> {
    return page.evaluate(() => {
        const sides = ['top', 'right', 'bottom', 'left'];

        const drawn = (style: CSSStyleDeclaration, side: string): boolean =>
            parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
            !style.getPropertyValue(`border-${side}-color`).endsWith(', 0)');

        const halfway = (radius: string, height: number): boolean => {
            if (radius.endsWith('%')) {
                return parseFloat(radius) >= 50;
            }

            return parseFloat(radius) >= height / 2;
        };

        return [...document.querySelectorAll('[role="tab"]')].map((tab) => {
            const style = getComputedStyle(tab);
            const radius = style.borderTopLeftRadius;

            return {
                bordered: sides.some((side) => drawn(style, side)),
                name: tab.textContent,
                pill: halfway(radius, tab.getBoundingClientRect().height),
                radius,
            };
        });
    });
}

/**
 * What each band of the window is painted with, beside the two surfaces of the system. The
 * colours are read back from the tokens instead of written here: the law is that the chrome
 * takes one surface and the work area the other, and a test that spelled the hex out would fail
 * for a change of palette that breaks nothing.
 */
async function skin(page: Page, parts: readonly string[]): Promise<Skin> {
    return page.evaluate((names) => {
        const swatch = document.createElement('div');

        document.body.append(swatch);

        const resolve = (token: string): string => {
            swatch.style.backgroundColor = `var(${token})`;

            return getComputedStyle(swatch).backgroundColor;
        };

        const fill = (part: string): string => {
            const element = document.querySelector(`[data-part='${part}']`);

            return element === null ? 'missing' : getComputedStyle(element).backgroundColor;
        };

        const chrome = Object.fromEntries(names.map((name) => [name, fill(name)]));
        const measured = {
            app: resolve('--surface-app'),
            chrome,
            panel: resolve('--surface-panel'),
            workbench: fill('workbench'),
        };

        swatch.remove();

        return measured;
    }, parts);
}

test('rounds its tabs by a step and draws its bands on the two surfaces of the system', async () => {
    const sandbox = await makeSandbox();
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    try {
        await expectFirstRun(page);
        await createConnection(page, 'alpha', NOWHERE, sandbox.repoRoot);

        const tabs = await tabShapes(page);

        expect(tabs.length).toBeGreaterThan(0);
        // The corner is the one of the scale, so neither of the two ways out of it passes: a
        // square tab reads as a folder of a file manager, and a pill reads as a chip.
        expect(tabs.filter((tab) => tab.radius !== ROUNDED)).toEqual([]);
        expect(tabs.filter((tab) => tab.pill)).toEqual([]);
        expect(tabs.filter((tab) => tab.bordered)).toEqual([]);

        const painted = await skin(page, CHROME);

        expect(painted.chrome).toEqual(
            Object.fromEntries(CHROME.map((part) => [part, painted.panel])),
        );
        expect(painted.workbench).toBe(painted.app);
        await expect
            .poll(() =>
                page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth),
            )
            .toBe('thin');
    } finally {
        await app.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
