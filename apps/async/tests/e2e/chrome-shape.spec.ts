import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { WINDOW_SIZE } from '../../../../packages/host/src/window/window-size.js';
import { scaleTokenValues } from '../../../../packages/ui/src/styles/token-scale-values.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

/** A URL nothing answers on. The tab is here to be measured, never to be dialled. */
const NOWHERE = 'wss://127.0.0.1:9/socket';

/** The bands of the chrome, each one named by the part it plays in the window. */
const CHROME = ['titlebar', 'sidebar', 'status-bar'];

/** A tab of the grid is rounded by the step of a tab: softer than a control, never a pill. */
const ROUNDED = scaleTokenValues['mandor-radius-xl'];

type TabShape = { bordered: boolean; name: string; pill: boolean; radius: string };

type Skin = { chrome: Record<string, string>; frame: string; strip: string; workbench: string };

/**
 * The shape of every tab of the grid, measured on what the browser resolved rather than on the
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

        return [...document.querySelectorAll('.dv-tab')].map((tab) => {
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
 * What each band of the window is painted with, beside the frame of the system. The colour is
 * read back from the token instead of written here: the law is that the chrome, the strip of
 * tabs and the work area all show the frame — the work has no surface of its own, its cards carry theirs — and a
 * test that spelled the hex out would fail for a change of palette that breaks nothing.
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
            chrome,
            frame: resolve('--surface-frame'),
            strip: getComputedStyle(
                document.querySelector('.dv-tabs-and-actions-container') ?? document.body,
            ).backgroundColor,
            workbench: fill('workbench'),
        };

        swatch.remove();

        return measured;
    }, parts);
}

/** The window buttons that fall short of the top or the bottom of the title row, by name. */
async function windowButtonsReach(page: Page): Promise<{ short: string[] }> {
    return page.evaluate(() => {
        const bar = document.querySelector("[data-part='titlebar']")?.getBoundingClientRect();
        const buttons = [...document.querySelectorAll("[data-part='window-controls'] button")];

        if (bar === undefined) {
            throw new Error('the window has no title row');
        }

        return {
            short: buttons
                .filter((button) => {
                    const box = button.getBoundingClientRect();

                    return (
                        Math.abs(box.top - bar.top) > 0.5 || Math.abs(box.bottom - bar.bottom) > 0.5
                    );
                })
                .map((button) => button.getAttribute('aria-label') ?? ''),
        };
    });
}

type Drift = { allowed: number; measured: number };

/**
 * How far the command centre stands from the middle of the window, and how far the two ends of
 * the title row let it. The ends are halves of the same weight, so the centre stands on the
 * middle; a half whose pieces need more than its share pushes it aside by that excess and by
 * nothing else. A screen narrower than the window the app asks for, as on a hosted Windows
 * runner, is where the push shows.
 */
async function centreDrift(page: Page): Promise<Drift> {
    return page.evaluate(() => {
        function part(name: string): Element {
            const found = document.querySelector(`[data-part='${name}']`);

            if (found === null) {
                throw new Error(`the title row has no ${name}`);
            }

            return found;
        }

        const bar = part('titlebar').getBoundingClientRect();
        const room = bar.width - part('title-search').getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(part('titlebar')).columnGap);
        const end = part('title-end');
        const startReach = part('title-start').lastElementChild?.getBoundingClientRect().right;
        const endReach = end.firstElementChild?.getBoundingClientRect().left;
        const startNeed = (startReach ?? bar.left) - bar.left + gap;
        const endNeed =
            bar.right -
            (endReach ?? bar.right) +
            parseFloat(getComputedStyle(end).paddingLeft) +
            gap;
        const left = startNeed > room / 2 ? startNeed : Math.min(room / 2, room - endNeed);
        const centre = part('command-center').getBoundingClientRect();

        return { allowed: left - room / 2, measured: centre.x + centre.width / 2 - innerWidth / 2 };
    });
}

/**
 * The centre where the window opens and again at the narrowest the window goes, where a half can
 * need more than its share: both times it drifts by what the halves allow and by nothing more.
 */
async function expectCentred(app: ElectronApplication, page: Page): Promise<void> {
    const wide = await centreDrift(page);

    expect(Math.abs(wide.measured - wide.allowed)).toBeLessThanOrEqual(1);
    await app.evaluate(({ BrowserWindow }, size) => {
        BrowserWindow.getAllWindows()[0]?.setSize(size.minWidth, size.minHeight);
    }, WINDOW_SIZE);
    await expect
        .poll(() => page.evaluate(() => innerWidth))
        .toBeLessThanOrEqual(WINDOW_SIZE.minWidth);

    const narrow = await centreDrift(page);

    expect(Math.abs(narrow.measured - narrow.allowed)).toBeLessThanOrEqual(1);
}

test('rounds its tabs by a step, draws its bands on the frame and centres the command centre', async () => {
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
            Object.fromEntries(CHROME.map((part) => [part, painted.frame])),
        );
        expect(painted.strip).toBe(painted.frame);
        expect(painted.workbench).toBe(painted.frame);
        // The window buttons run from the top of the row to its bottom, like the ones of the
        // system: a button shorter than the row floats in its middle. macOS draws its own.
        expect(await windowButtonsReach(page)).toEqual({ short: [] });

        // The command centre stands on the middle of the window, not on the middle of the room
        // the two ends leave between them.
        await expectCentred(app, page);
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
