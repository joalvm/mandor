/**
 * Two budgets, and only one of them is an assertion. Each `expect` waits ten seconds, which is
 * what catches a control that never appears. The per-test budget covers a whole flow instead:
 * two Electron launches, a repository laid out on disk and the editor loaded, which already costs
 * nineteen seconds on a Windows runner. Thirty left nothing for a slower one.
 */
export const E2E_CONFIG = {
    expect: { timeout: 10_000 },
    fullyParallel: false,
    outputDir: 'test-results',
    // A hosted Windows runner now and then takes long to open an Electron window, in a different
    // test each run; the launch has its own budget and ends a window that misses it. One more try
    // on CI covers what is left, and the report names a test that needed it as flaky. A test that
    // needs two is broken, and a third run of it would only spend minutes hiding that.
    retries: process.env['CI'] === undefined ? 0 : 1,
    // An app that does not open fails every test the same way. Three are enough to say so; the
    // rest would wait out their budgets one by one on a runner billed by the minute.
    maxFailures: process.env['CI'] === undefined ? 0 : 3,
    reporter: 'line',
    // The run ends naming the slowest files, so where the minutes of a runner go is read from
    // the log of any run instead of guessed. The default only names a file past five minutes.
    reportSlowTests: { max: 10, threshold: 15_000 },
    testDir: 'tests/e2e',
    timeout: 90_000,
    use: {
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    workers: 1,
};
