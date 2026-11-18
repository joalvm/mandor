import { rm } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { measureStarts } from '../../../../packages/host/tests/support/measure-start.js';
import { BUDGETS, HOSTED_WINDOW_READY_MS, type StartBudget } from './support/budgets.js';
import { launch, makeSandbox } from './support/launch-app.js';

// skip-policy: macOS e2e runs by label only; no budget was measured there
test.skip(process.platform === 'darwin', 'macOS e2e runs by label only; no budget was measured');

/**
 * Every figure against its ceiling, each one reported even when another is over. The time of a
 * hosted runner has a ceiling of its own: its machines are not the container the rest was
 * measured in.
 */
function expectInsideBudget(measured: StartBudget): void {
    const budget = BUDGETS[process.platform];

    if (budget === undefined) {
        return;
    }

    const readyCeiling =
        process.env['CI'] === undefined
            ? budget.windowReadyMs
            : HOSTED_WINDOW_READY_MS[process.platform];

    if (readyCeiling !== undefined) {
        expect.soft(measured.windowReadyMs).toBeLessThanOrEqual(readyCeiling);
    }

    expect.soft(measured.workingSetMb).toBeLessThanOrEqual(budget.workingSetMb);
    expect.soft(measured.heapUsedMb).toBeLessThanOrEqual(budget.heapUsedMb);
    expect.soft(measured.mainHeapUsedMb).toBeLessThanOrEqual(budget.mainHeapUsedMb);
    expect.soft(measured.domNodes).toBeLessThanOrEqual(budget.domNodes);
}

test('a start of the app and the window at rest stay inside the budget', async () => {
    const { defaultRepoRoot, root, userDataDir } = await makeSandbox();

    try {
        const measured = await measureStarts(
            userDataDir,
            () => launch(userDataDir, defaultRepoRoot),
            (ready) => expect.poll(ready).toBe(true),
        );

        test.info().annotations.push({ type: 'measured', description: JSON.stringify(measured) });
        // The line reporter prints no annotation, and a new ceiling is read from the log of the CI.
        console.log(`measured on ${process.platform}: ${JSON.stringify(measured)}`);
        expectInsideBudget(measured);
    } finally {
        await rm(root, { force: true, maxRetries: 10, recursive: true });
    }
});
