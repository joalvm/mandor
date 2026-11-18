import { execFile } from 'node:child_process';

/** What the app is given to start, and then to open its first window. */
const OPEN_BUDGET_MS = 30_000;

/** What a closing app is given before it is ended by force. */
const CLOSE_BUDGET_MS = 20_000;

/** What an app ended by force is given to go before the test moves on without it. */
const FORCED_BUDGET_MS = 5_000;

/**
 * The main process alone is not enough on Windows: its renderer, GPU and utility processes
 * inherit the pipes the test runner reads, and the runner keeps waiting while any of them lives.
 */
function endByForce(app) {
    const pid = app.process().pid;

    if (process.platform === 'win32' && pid !== undefined) {
        execFile('taskkill', ['/pid', String(pid), '/t', '/f'], () => undefined);

        return;
    }

    app.process().kill('SIGKILL');
}

function gone(app) {
    const child = app.process();

    if (child.exitCode !== null || child.signalCode !== null) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        child.once('exit', () => {
            resolve();
        });
    });
}

function after(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * A close that does not come back within its budget is ended by force, and the test waits a
 * little longer for the process to go and no longer: a close that never returns would otherwise
 * spend the whole budget of the test, and then the teardown of the worker.
 */
async function closeWithin(app, close) {
    const started = Date.now();
    const closing = close();
    let timer;
    const forced = new Promise((resolve) => {
        timer = setTimeout(() => {
            resolve('forced');
        }, CLOSE_BUDGET_MS);
    });

    // Once forced, whatever the close says afterwards no longer reaches anyone.
    closing.catch(() => undefined);

    try {
        if ((await Promise.race([closing, forced])) === 'forced') {
            console.log(`electron close forced after ${String(Date.now() - started)} ms`);
            endByForce(app);
            await Promise.race([gone(app), after(FORCED_BUDGET_MS)]);
        }
    } finally {
        clearTimeout(timer);
    }
}

/**
 * What a window writes to its console as a warning or an error, or throws with nobody to catch
 * it, is kept for the close to fail on: the same line a unit test fails on in `console.error`.
 */
function keepConsole(page, written) {
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            written.push(`${message.type()}: ${message.text()}`);
        }
    });
    page.on('pageerror', (error) => {
        written.push(`threw: ${String(error)}`);
    });
}

/**
 * Opens an app like `electron.launch` does, with two differences a hosted Windows runner asks
 * for. The first window is waited for here, and an app whose window never opens is closed before
 * the failure is thrown, so no test is left holding a live app it never got. And a close that
 * does not come back is ended by force instead of spending the budget of the test. Both apps
 * open through here, each with the Playwright its own manifest declares.
 *
 * The close also fails the test on what its windows wrote to their consoles. The failure is soft:
 * a test that already failed keeps its own error beside it, since the close runs in its `finally`.
 */
export async function launchElectron({ electron, expect }, options) {
    const opened = Date.now();
    const app = await electron.launch({ timeout: OPEN_BUDGET_MS, ...options });
    const close = app.close.bind(app);
    const written = [];

    app.close = async () => {
        await closeWithin(app, close);
        expect.soft(written, 'what the windows wrote to their consoles').toEqual([]);
    };

    app.windows().forEach((page) => {
        keepConsole(page, written);
    });
    app.on('window', (page) => {
        keepConsole(page, written);
    });

    try {
        await app.firstWindow({ timeout: OPEN_BUDGET_MS });
    } catch (error) {
        await app.close();
        throw error;
    }

    console.log(`electron opened its window in ${String(Date.now() - opened)} ms`);

    return app;
}
