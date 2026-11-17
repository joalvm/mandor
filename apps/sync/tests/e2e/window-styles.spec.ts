import { rm } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { watchCspViolations } from '../../../../packages/ui/tests/support/csp-violations.js';
import { launch, makeSandbox } from './support/launch-app.js';

/**
 * A menu locks the scroll of the window while it is open, and it does that with a style sheet it
 * writes at that moment. The window signs every sheet from its first frame, not from the moment its
 * editor loads, so a menu opened first is signed too, and nothing is refused.
 */
test('signs the sheet a menu writes to lock the scroll', async () => {
    const sandbox = await makeSandbox();
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
    const refused = watchCspViolations(page);

    try {
        await page.getByRole('button', { name: 'Personal', exact: true }).click();
        await expect(page.getByRole('menu')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('menu')).toBeHidden();

        expect(refused).toEqual([]);
    } finally {
        await app.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

/**
 * A pattern with a quantifier inside a quantifier backtracks exponentially, and the schemas that
 * check every frame and payload come with the documents a user imports. The window reads such a
 * regex again with V8's linear engine. Main starts without it: a V8 flag set there at run time
 * kills the process at the next worker. There `@mandor/validate` finds no linear engine and
 * leaves the risky patterns out instead.
 */
test('answers a regex that backtracks without end in the window, and main has no linear engine', async () => {
    const sandbox = await makeSandbox();
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    try {
        await expect(page.evaluate(backtracks)).resolves.toBe(false);
        await expect(app.evaluate(readsLinear)).resolves.toBe(false);
    } finally {
        await app.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

/** Forty characters of a near miss: 2^40 ways to split them for the backtracking engine. */
function backtracks(): boolean {
    return new RegExp('^([0-9a-f-]+)*x$').test('0'.repeat(40));
}

/** Whether the runtime takes the flag of the linear engine. */
function readsLinear(): boolean {
    try {
        new RegExp('a', 'l');

        return true;
    } catch {
        return false;
    }
}
