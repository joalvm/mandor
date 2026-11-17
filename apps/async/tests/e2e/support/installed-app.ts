import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { chmod, copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { chromium, expect, type Browser, type Page } from '@playwright/test';

/**
 * The name Windows gives the installed executable and its uninstaller. electron-builder takes it
 * from `executableName`, and the product name only when there is none.
 */
const EXECUTABLE = 'mandor-realtime';

export type Installed = {
    /** The folder the app was installed to, which holds the executable. */
    directory: string;
    uninstall: () => Promise<void>;
};

export type OpenApp = {
    page: Page;
    /** Asks the app to quit the way a person closing its window does, and waits for it to go. */
    quit: () => Promise<void>;
    /** Settles when the process has gone, however it went. */
    exited: Promise<void>;
    /** Closes the connection and ends the process if it is still there. */
    close: () => Promise<void>;
};

/**
 * Installs the way a person does, into a folder of the sandbox. Windows: the installer in silent
 * mode for the current user, with `/D` last and unquoted, as NSIS requires. Linux: the AppImage
 * copied there and made executable, which is all its install is.
 */
export async function install(installer: string, sandbox: string): Promise<Installed> {
    const directory = join(sandbox, 'app');

    if (process.platform === 'win32') {
        const done = spawnSync(installer, ['/S', '/currentuser', `/D=${directory}`]);

        if (done.status !== 0) {
            throw new Error(`the installer ended with ${String(done.status)}`);
        }

        return { directory, uninstall: () => uninstallNsis(directory) };
    }

    const target = join(directory, basename(installer));

    await rm(directory, { force: true, recursive: true });
    await mkdir(directory, { recursive: true });
    await copyFile(installer, target);
    await chmod(target, 0o755);

    return { directory, uninstall: () => rm(directory, { force: true, recursive: true }) };
}

function uninstallNsis(directory: string): Promise<void> {
    const done = spawnSync(join(directory, `Uninstall ${EXECUTABLE}.exe`), ['/S']);

    return done.status === 0
        ? Promise.resolve()
        : Promise.reject(new Error(`the uninstaller ended with ${String(done.status)}`));
}

/**
 * The executable of an installed folder. An AppImage is found by its extension, since the updater
 * writes the new one next to the old and removes the old by its versioned name.
 */
export async function executableIn(directory: string): Promise<string> {
    if (process.platform === 'win32') {
        return join(directory, `${EXECUTABLE}.exe`);
    }

    const images = (await readdir(directory)).filter((name) => name.endsWith('.AppImage'));

    if (images.length !== 1 || images[0] === undefined) {
        throw new Error(`expected one AppImage in ${directory}, found ${String(images.length)}`);
    }

    return join(directory, images[0]);
}

/** The installer a build left in a folder: the one `.exe` or `.AppImage`, and not its blockmap. */
export async function installerIn(directory: string): Promise<string> {
    const extension = process.platform === 'win32' ? '.exe' : '.AppImage';
    const found = (await readdir(directory)).filter((name) => name.endsWith(extension));

    if (found.length !== 1 || found[0] === undefined) {
        throw new Error(`expected one ${extension} in ${directory}, found ${String(found.length)}`);
    }

    return join(directory, found[0]);
}

async function readPort(path: string): Promise<string> {
    try {
        return (await readFile(path, 'utf8')).split('\n')[0] ?? '';
    } catch {
        return '';
    }
}

async function initialPage(browser: Browser): Promise<Page> {
    const [context] = browser.contexts();

    if (context === undefined) {
        throw new Error('the installed app did not expose a browser context');
    }

    const titled = async (): Promise<Page | undefined> => {
        for (const page of context.pages()) {
            if ((await page.locator('[data-part="titlebar"]').count()) > 0) {
                return page;
            }
        }

        return undefined;
    };

    await expect.poll(async () => (await titled()) !== undefined).toBe(true);

    const page = await titled();

    if (page === undefined) {
        throw new Error('the installed app did not reach its initial screen');
    }

    return page;
}

function stopped(app: ChildProcess): Promise<void> {
    if (app.exitCode !== null || app.signalCode !== null) {
        return Promise.resolve();
    }

    return once(app, 'exit').then(() => undefined);
}

/**
 * Opens an installed app and connects to it. The fuse that allows `--inspect` is off, so the
 * Playwright launcher cannot drive it: it is opened with a debugging port the runtime picks, read
 * from the file it writes in the user data folder, and reached over CDP.
 */
export async function openInstalled(
    executable: string,
    userDataDir: string,
    env: Record<string, string> = {},
): Promise<OpenApp> {
    const portFile = join(userDataDir, 'DevToolsActivePort');

    // A start before this one left its port in the folder: it is gone, or it would be read first.
    await rm(portFile, { force: true });

    const app = spawn(executable, [`--user-data-dir=${userDataDir}`, '--remote-debugging-port=0'], {
        env: { ...process.env, ...env },
        stdio: 'ignore',
    });
    const exited = stopped(app);

    await expect.poll(() => readPort(portFile)).not.toBe('');

    const port = await readPort(portFile);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);

    return {
        page: await initialPage(browser),
        exited,
        quit: async () => {
            const session = await browser.newBrowserCDPSession();

            // The browser goes before it answers, and the answer never settles: only the exit is
            // waited for.
            void session.send('Browser.close').catch(() => undefined);
            await exited;
        },
        close: async () => {
            await browser.close();

            if (app.exitCode === null) {
                app.kill();
            }

            await exited;
        },
    };
}
