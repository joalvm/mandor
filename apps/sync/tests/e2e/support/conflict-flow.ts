// The tab of a clash driven the way a user drives it, and the pieces of the road around it.

import { expect, type Locator, type Page } from '@playwright/test';

import { saveRequest } from './send-flow.js';
import { writeBody, writeHeaderValue } from './spanish-flow.js';
import { openSection } from './open-section.js';

/** The few words the bottom bar says of how the window stands. */
export function statusOf(page: Page): Locator {
    return page.locator('[data-part="status-line"] [data-part="status-text"]');
}

/** The header and the body of the request in front, both written over what they had. */
export async function editHeaderAndBody(page: Page, value: string, body: string): Promise<void> {
    await writeHeaderValue(page, value);
    await openSection(page, 'Body');
    await writeBody(page, body);
    await saveRequest(page);
}

/** Presses the answer of the notice that said something clashed. */
export async function pressResolveInNotice(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Resolver' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('(Headers)');
}

/** Writes the answers down, from the foot of the last step: the tab closes once they are in. */
export async function pressResolve(page: Page): Promise<void> {
    const foot = page.locator('[data-part="conflict-actions"]');

    await expect(foot.getByRole('button', { exact: true, name: 'Resolver' })).toBeEnabled();
    await foot.getByRole('button', { exact: true, name: 'Resolver' }).click();
    await expect(page.getByRole('tab', { name: /^Conflictos/ })).toHaveCount(0);
}
