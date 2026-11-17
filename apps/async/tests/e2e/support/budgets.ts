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
// window-ready 578 ms, working set 561 MB, heap 16.3 MB, 249 nodes. Ceiling: +30 % time, +20 %
// the rest.
// main heap: measured 2026-10-30 in the same container, 8.4 MB on two runs; ceiling +20 %.
// win32: measured 2026-11-06 on windows-latest, on two runs: window-ready 1234-1620 ms, working set
// 402 MB, heap 18.3 MB, main heap 8.7 MB, 222 nodes. Same rule, over the highest of each.
export const BUDGETS: Partial<Record<NodeJS.Platform, StartBudget>> = {
    linux: {
        windowReadyMs: 760,
        workingSetMb: 680,
        heapUsedMb: 20,
        mainHeapUsedMb: 11,
        domNodes: 300,
    },
    win32: {
        windowReadyMs: 2110,
        workingSetMb: 490,
        heapUsedMb: 22,
        mainHeapUsedMb: 11,
        domNodes: 270,
    },
};

/**
 * The window-ready ceiling on a hosted runner of the CI, by platform. Its machines start the app
 * slower than the container the budgets above were measured in, and the rest of a budget does not
 * depend on the machine. A platform without an entry asserts no time on the CI.
 */
// linux: measured 2026-11-06 on ubuntu-latest, 1050 and 1093 ms; ceiling +30 %.
// win32: measured 2026-11-06 on windows-latest, 1234 and 1620 ms; ceiling +30 %.
export const HOSTED_WINDOW_READY_MS: Partial<Record<NodeJS.Platform, number>> = {
    linux: 1430,
    win32: 2110,
};
