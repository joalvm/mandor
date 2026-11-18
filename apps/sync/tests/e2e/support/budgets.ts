/** What a start of the app may cost on one platform, and what the window may weigh at rest. */
export type StartBudget = {
    /** Milliseconds from the start of the process to the window drawing what it restored. */
    windowReadyMs: number;
    /** Everything the system sees of the app, in MB. */
    workingSetMb: number;
    /** What the JS of the window retains once the garbage is gone, in MB. */
    heapUsedMb: number;
    /** What the JS of main retains once the garbage is gone, in MB. */
    mainHeapUsedMb: number;
    /** Nodes of the DOM of the window at rest. */
    domNodes: number;
};

/**
 * The ceilings, by platform. A platform without an entry is measured and written down in the
 * report of the run, and nothing is asserted: a number nobody measured there would be a guess.
 */
// linux: measured 2026-10-09 in the container of `npm run ci:e2e` (Ubuntu 24.04, Electron headless):
// window-ready 698 ms, working set 572 MB, heap 16.6 MB, 219 nodes. Ceiling: +30 % time, +20 %
// the rest. Re-measured 2026-10-13 with the collections package in the bundle: window-ready
// 931-965 ms, and the ceiling keeps the air the same rule gave, without stretching the rest.
// main heap: measured 2026-10-30 in the same container, 12.2 MB on two runs; ceiling +20 %.
// win32: measured 2026-11-06 on windows-latest: window-ready 1663 ms, working set 417 MB, heap
// 18.2 MB, main heap 12.6 MB, 219 nodes. Same rule.
export const BUDGETS: Partial<Record<NodeJS.Platform, StartBudget>> = {
    linux: {
        windowReadyMs: 1000,
        workingSetMb: 690,
        heapUsedMb: 20,
        mainHeapUsedMb: 15,
        domNodes: 265,
    },
    win32: {
        windowReadyMs: 2170,
        workingSetMb: 505,
        heapUsedMb: 22,
        mainHeapUsedMb: 16,
        domNodes: 265,
    },
};

/**
 * The window-ready ceiling on a hosted runner of the CI, by platform. Its machines start the app
 * slower than the container the budgets above were measured in, and the rest of a budget does not
 * depend on the machine. A platform without an entry asserts no time on the CI.
 */
// linux: measured 2026-11-06 on ubuntu-latest, 1137 and 1158 ms; ceiling +30 %.
// win32: measured 2026-11-06 on windows-latest, 1663 ms; ceiling +30 %.
export const HOSTED_WINDOW_READY_MS: Partial<Record<NodeJS.Platform, number>> = {
    linux: 1510,
    win32: 2170,
};
