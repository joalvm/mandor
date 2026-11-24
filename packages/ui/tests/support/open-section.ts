import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Opens a section the way a person has to at this width: by its tab while it has room, by the menu
 * of its strip once it does not. The room is not fixed: a screen narrower than the window the app
 * asks for, as on a hosted Windows or macOS runner, leaves out sections that a wider one shows.
 *
 * The strip fits itself again when an answer adds sections, so a tab that had room when it was
 * read can lose it before the click lands: the click that finds it gone reads the strip again.
 *
 * A menu fades out after its choice, and while it fades it still holds the keys and hides the
 * window from the tree: the next key waits until it is gone, as a person waits to see it close.
 *
 * A column of sections stands whole, one under another, so its tabs are always in view.
 *
 * The strip is of this package, and so is the one place that knows how it hides what does not
 * fit: the runs of both apps come here for it. Without a closer scope the list is the first on
 * the page with a section of that name.
 */
export async function openSection(scope: Page | Locator, name: string | RegExp): Promise<void> {
    const tab = scope.locator('[data-part="tabs-list"]').getByRole('tab', { name }).first();

    await expect(() => openOnce(tab, name)).toPass({ timeout: 30_000 });
}

async function openOnce(tab: Locator, name: string | RegExp): Promise<void> {
    if ((await tab.getAttribute('data-out-of-view')) === null) {
        await tab.click({ timeout: 2_000 });

        return;
    }

    const strip = tab.locator('xpath=ancestor::*[@data-part="tabs-strip"]');
    const label = await strip.getByRole('tablist').getAttribute('aria-label');

    // The menu is named like the list, because it is the rest of it.
    await strip.getByRole('button', { exact: true, name: label ?? '' }).click();
    await tab.page().getByRole('menuitem', { name }).click();
    await expect(tab.page().getByRole('menu')).toBeHidden();
}
