import { expect, type Page } from '@playwright/test';

import { INTERFACE_VOCABULARY } from '../../../../../packages/i18n/tests/support/interface-vocabulary.js';

/** The words of git never reach the reader: the page, as text, is checked at every stop. */
export async function expectPlainWords(page: Page): Promise<void> {
    const text = await page.evaluate(() => document.body.innerText);

    expect(text).not.toMatch(INTERFACE_VOCABULARY);
}
