import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication } from '@playwright/test';

import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

const TABS = ['Alfa', 'Beta', 'Gamma'];

async function logOf(sandbox: Sandbox): Promise<string> {
    return readFile(join(sandbox.userDataDir, 'mandor.log'), 'utf8').catch(() => '');
}

/** The tabs of the session are on disk when the file that keeps them names all three. */
async function expectSessionSaved(sandbox: Sandbox): Promise<void> {
    const file = join(sandbox.repoRoot, '.mandor', 'session.yaml');

    await expect
        .poll(async () => {
            const saved = await readFile(file, 'utf8').catch(() => '');

            return (saved.match(/resource:/g) ?? []).length;
        })
        .toBeGreaterThanOrEqual(TABS.length);
}

/** What the reloaded window shows: the tabs it drew and the words on it, read inside the window. */
const SEEN = `({
    tabs: [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent ?? ''),
    text: document.body.innerText,
})`;

type Seen = { done: boolean; tabs: string[]; text: string };

/**
 * Playwright keeps a page that crashed as crashed for good, and with it the app: every call
 * after the crash answers "Target crashed" or "closed", also once main reloaded the same window.
 * So main itself looks at the window it reloaded, from inside, and writes what it saw to a file
 * the test reads.
 */
async function watchReload(app: ElectronApplication, file: string): Promise<void> {
    await app.evaluate(
        ({ webContents }, arg) => {
            const fs = process.getBuiltinModule('node:fs');
            const contents = webContents.getAllWebContents()[0];
            let tries = 0;
            let started = false;

            const look = (): void => {
                tries += 1;

                const again = (): void => {
                    // timing-policy: a look from inside main, waiting for the window to draw what it restored
                    setTimeout(look, 250);
                };

                contents?.executeJavaScript(arg.script).then((seen: Omit<Seen, 'done'>) => {
                    const done =
                        arg.names.every((name) => seen.tabs.some((tab) => tab.includes(name))) &&
                        seen.text.includes(arg.notice);

                    fs.writeFileSync(arg.file, JSON.stringify({ ...seen, done }));

                    if (!done && tries < 80) {
                        again();
                    }
                }, again);
            };

            contents?.on('did-finish-load', () => {
                if (!started) {
                    started = true;
                    look();
                }
            });
        },
        { file, names: TABS, notice: 'The window restarted', script: SEEN },
    );
}

test('a window whose renderer dies comes back with its tabs, tells so and writes why', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = first.app;
        await expectFirstRun(first.page);

        for (const name of TABS) {
            await createConnection(first.page, name, 'ws://localhost:3000', sandbox.repoRoot);
        }

        await expectSessionSaved(sandbox);
        const seen = join(sandbox.root, 'window-seen.json');

        await watchReload(running, seen);
        await running.evaluate(({ webContents }) => {
            webContents.getAllWebContents()[0]?.forcefullyCrashRenderer();
        });

        await expect
            .poll(async () =>
                readFile(seen, 'utf8').then(
                    (text) => JSON.parse(text) as Seen,
                    () => undefined,
                ),
            )
            .toMatchObject({ done: true });
        await expect.poll(() => logOf(sandbox)).toContain('render-process-gone');
    } finally {
        await test.info().attach('mandor.log', { body: await logOf(sandbox) });
        await test.info().attach('window-seen.json', {
            body: await readFile(join(sandbox.root, 'window-seen.json'), 'utf8').catch(() => ''),
        });

        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

test('an error nobody caught in main raises the main-fault notice, is written, and main goes on', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = first.app;
        await expectFirstRun(first.page);
        await running.evaluate(() => {
            setTimeout(() => {
                throw new Error('thrown on purpose');
            }, 0);
        });

        await expect(first.page.getByText('Something failed inside the app').first()).toBeVisible();
        await expect.poll(() => logOf(sandbox)).toContain('thrown on purpose');
        await expect(first.page.getByRole('button', { name: /^Notices/ })).toBeVisible();
        expect(running.process().exitCode).toBeNull();
    } finally {
        await test.info().attach('mandor.log', { body: await logOf(sandbox) });

        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

/**
 * Where Linux has no keyring, Chromium encrypts with a key every copy carries: the window hears
 * that passwords and tokens last until Mandor closes. Electron is asked which backend it picked,
 * so a machine with a keyring asserts nothing it cannot see.
 */
test('a system with no keychain is told its secrets last until Mandor closes', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = first.app;
        await expectFirstRun(first.page);

        const backend = await running.evaluate(({ safeStorage }) =>
            process.platform === 'linux' ? safeStorage.getSelectedStorageBackend() : 'system',
        );

        // skip-policy: only a Linux without keyring falls back to the key written into Chromium.
        test.skip(backend !== 'basic_text', 'this system keeps the key in a keychain');

        await expect(first.page.getByText('This system has no keychain').first()).toBeVisible();
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
