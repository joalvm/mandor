import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

/** A URL nothing answers on. The composer is what is being read here, never the socket. */
const NOWHERE = 'wss://127.0.0.1:9/socket';

const COMPOSER = '[data-part="composer"]';

/** The mono type of every editor: 12 pixels on lines of 18, the editors the user already reads payloads in. */
const CODE_TYPE = { fontSize: '12px', lineHeight: '18px' };

/** The composer is what is read here, and it is only drawn for an event the connection holds. */
const EVENT = 'Pedido creado';

/** What the computed style of the editor says, once the window has laid it out. */
async function typeOfComposer(page: Page): Promise<Record<string, string>> {
    return editorLines(page.locator(COMPOSER), 'schema-pane-editor').evaluate((element) => {
        const style = getComputedStyle(element);

        return {
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
        };
    });
}

/**
 * The height of one line of text and the height of the number that names it. They come from the
 * same token, so they are the same number; when they are not, the margin drifts away from its
 * rows a pixel per line and the drift is only visible far down a long payload.
 */
async function rowHeights(page: Page): Promise<{ line: number; number: number }> {
    const line = await page.locator(`${COMPOSER} .view-line`).first().boundingBox();
    const number = await page
        .locator(`${COMPOSER} .margin-view-overlays .line-numbers`)
        .first()
        .boundingBox();

    return { line: line?.height ?? 0, number: number?.height ?? 0 };
}

/** A first run that ends with the composer of an event on screen, and the check that reads it. */
async function inComposer(connection: string, check: (page: Page) => Promise<void>): Promise<void> {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = app;
        await expectFirstRun(page);
        await createConnection(page, connection, NOWHERE, sandbox.repoRoot);
        await createEvent(page, EVENT);
        await openEvent(page, EVENT);
        await expect(editorLines(page.locator(COMPOSER), 'schema-pane-editor')).toBeVisible();
        await check(page);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
}

test('draws the payload with the code type of the product and numbers its rows in step', async () => {
    await inComposer('type', async (page) => {
        expect(await typeOfComposer(page)).toEqual(CODE_TYPE);

        const heights = await rowHeights(page);

        expect(heights.line).toBeCloseTo(heights.number, 1);
        expect(heights.line).toBeCloseTo(Number.parseInt(CODE_TYPE.lineHeight, 10), 1);
    });
});

/**
 * The editor hides its find widget just above the first line, with room for a shadow of its own
 * and no more. A shadow of the window that reaches further, put on the widget, would be left
 * lying over the text once it closes.
 */
test('closes its find widget without leaving a shadow over the text', async () => {
    await inComposer('find', async (page) => {
        const find = page.locator(`${COMPOSER} .find-widget`);

        await editorLines(page.locator(COMPOSER), 'schema-pane-editor').click();
        await page.keyboard.press('ControlOrMeta+f');
        await expect(find).toHaveAttribute('aria-hidden', 'false');
        await page.keyboard.press('Escape');
        await expect(find).toHaveAttribute('aria-hidden', 'true');
        await expect(find).toHaveCSS('box-shadow', 'none');
    });
});

/**
 * The wheel turned with the zoom key held over an editor resizes the type of the editors of the
 * window, a tenth of its size for each notch, and the zoom key with the zero brings it back. The
 * size is the requirement here, so it is read off the computed style the window laid out.
 */
test('resizes its type under the wheel with the zoom key held, and back with the zero', async () => {
    await inComposer('zoom', async (page) => {
        const lines = editorLines(page.locator(COMPOSER), 'schema-pane-editor');

        await lines.hover();
        await page.keyboard.down('Control');
        await page.mouse.wheel(0, -100);
        await page.keyboard.up('Control');
        await expect(lines).toHaveCSS('font-size', '13.2px');
        await expect(lines).toHaveCSS('line-height', '20px');

        await lines.click();
        await page.keyboard.press('Control+0');
        await expect(lines).toHaveCSS('font-size', CODE_TYPE.fontSize);
    });
});
