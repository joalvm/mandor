import { rm } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { launch, makeSandbox } from './support/launch-app.js';

/** What the collection owes every icon it renders, wherever it sits in the window. */
async function iconFacts(page: Page) {
    return page.evaluate(() => {
        const icons = [...document.querySelectorAll('svg[data-part="icon"]')];
        const foreign = [...document.querySelectorAll('link[href], use[href], img[src]')].filter(
            (element) => {
                const reference = element.getAttribute('href') ?? element.getAttribute('src') ?? '';

                return /^https?:\/\//.test(reference) || reference.includes('codicon');
            },
        );
        const first = icons[0];

        if (first === undefined) {
            return { count: 0, foreign: foreign.length, hidden: false, sized: false };
        }

        const sized = ['12', '16', '24'].includes(first.getAttribute('width') ?? '');

        return {
            count: icons.length,
            foreign: foreign.length,
            hidden: icons.every((icon) => icon.getAttribute('aria-hidden') === 'true'),
            sized,
        };
    });
}

/** A fill of currentColor resolves to the text color the icon inherits; a fixed fill would not. */
async function followsTextColor(page: Page): Promise<boolean> {
    return page.evaluate(() => {
        const icon = document.querySelector('svg[data-part="icon"]');

        if (icon === null) {
            return false;
        }

        const style = getComputedStyle(icon);

        return style.fill === style.color && style.fill !== 'none';
    });
}

test('draws its icons from the bundled collection, hidden and without foreign resources', async () => {
    const sandbox = await makeSandbox();
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    try {
        const requests: string[] = [];

        page.on('request', (request) => {
            requests.push(request.url());
        });

        await expect(page.locator('svg[data-part="icon"]').first()).toBeVisible();

        const facts = await iconFacts(page);

        expect(facts.count).toBeGreaterThan(0);
        expect(facts.hidden).toBe(true);
        expect(facts.sized).toBe(true);
        expect(facts.foreign).toBe(0);

        expect(await followsTextColor(page)).toBe(true);

        const remote = requests.filter(
            (url) =>
                /^https?:\/\//.test(url) &&
                !url.startsWith('http://127.0.0.1') &&
                !url.startsWith('http://localhost'),
        );

        expect(remote, 'ninguna petición remota').toEqual([]);
    } finally {
        await app.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
