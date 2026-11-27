import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { chmod, copyFile, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { chromium, expect } from '@playwright/test';

/**
 * Installs the way a person does, into a folder of the sandbox. Windows: the installer in silent
 * mode for the current user, with `/D` last and unquoted, as NSIS requires. Linux: the AppImage
 * copied there and made executable, which is all its install is.
 *
 * `executable` is the name Windows gives the installed program and its uninstaller:
 * electron-builder takes it from `executableName`, and the product name only when there is none.
 */
export async function install(installer, sandbox, executable) {
    const directory = join(sandbox, 'app');

    if (process.platform === 'win32') {
        const done = spawnSync(installer, ['/S', '/currentuser', `/D=${directory}`]);

        if (done.status !== 0) {
            throw new Error(`the installer ended with ${String(done.status)}`);
        }

        return { directory, uninstall: () => uninstallNsis(directory, executable) };
    }

    const target = join(directory, basename(installer));

    await rm(directory, { force: true, recursive: true });
    await mkdir(directory, { recursive: true });
    await copyFile(installer, target);
    await chmod(target, 0o755);

    return { directory, uninstall: () => rm(directory, { force: true, recursive: true }) };
}

function uninstallNsis(directory, executable) {
    const done = spawnSync(join(directory, `Uninstall ${executable}.exe`), ['/S']);

    return done.status === 0
        ? Promise.resolve()
        : Promise.reject(new Error(`the uninstaller ended with ${String(done.status)}`));
}

/**
 * The executable of an installed folder. An AppImage is found by its extension, since the updater
 * writes the new one next to the old and removes the old by its versioned name.
 */
export async function executableIn(directory, executable) {
    if (process.platform === 'win32') {
        return join(directory, `${executable}.exe`);
    }

    const images = (await readdir(directory)).filter((name) => name.endsWith('.AppImage'));

    if (images.length !== 1 || images[0] === undefined) {
        throw new Error(`expected one AppImage in ${directory}, found ${String(images.length)}`);
    }

    return join(directory, images[0]);
}

/** The installer a build left in a folder: the one `.exe` or `.AppImage`, and not its blockmap. */
export async function installerIn(directory) {
    const extension = process.platform === 'win32' ? '.exe' : '.AppImage';
    const found = (await readdir(directory)).filter((name) => name.endsWith(extension));

    if (found.length !== 1 || found[0] === undefined) {
        throw new Error(`expected one ${extension} in ${directory}, found ${String(found.length)}`);
    }

    return join(directory, found[0]);
}

/** The end of the name of the installer a release ships for the machine running this. */
const RELEASE_INSTALLER = { win32: '-win-x64.exe', linux: '-linux-x86_64.AppImage' };

/**
 * The installer of this system among the ones a release built: a release holds one per system
 * and architecture, and the runners are x64.
 */
async function releaseInstallerIn(directory) {
    const ending = RELEASE_INSTALLER[process.platform];
    const found = (await readdir(directory)).filter((name) => name.endsWith(ending ?? '\0'));

    if (found.length !== 1 || found[0] === undefined) {
        throw new Error(
            `expected one *${String(ending)} in ${directory}, found ${String(found.length)}`,
        );
    }

    return join(directory, found[0]);
}

async function readPort(path) {
    try {
        return (await readFile(path, 'utf8')).split('\n')[0] ?? '';
    } catch {
        return '';
    }
}

async function titledPage(context) {
    for (const page of context.pages()) {
        if ((await page.locator('[data-part="titlebar"]').count()) > 0) {
            return page;
        }
    }

    return undefined;
}

async function initialPage(browser) {
    const [context] = browser.contexts();

    if (context === undefined) {
        throw new Error('the installed app did not expose a browser context');
    }

    await expect.poll(async () => (await titledPage(context)) !== undefined).toBe(true);

    const page = await titledPage(context);

    if (page === undefined) {
        throw new Error('the installed app did not reach its initial screen');
    }

    return page;
}

function stopped(app) {
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
export async function openInstalled(executable, userDataDir, env = {}) {
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

/**
 * Installs the installer a release built for this system into a sandbox, opens it on its first
 * screen, with its data and its documents in the sandbox too, and reads the agent of its window,
 * where Electron names the app and its version. Then quits the app the way a person does,
 * uninstalls it and removes the sandbox.
 */
export async function releaseAgent({ installers, executable, name }) {
    const sandbox = await mkdtemp(join(tmpdir(), `mandor-${name}-release-`));
    const installed = await install(await releaseInstallerIn(installers), sandbox, executable);
    const app = await openInstalled(
        await executableIn(installed.directory, executable),
        join(sandbox, 'data'),
        { MANDOR_DEFAULT_REPO_ROOT: join(sandbox, 'repo') },
    );

    try {
        return await app.page.evaluate(() => navigator.userAgent);
    } finally {
        await app.quit();
        await installed.uninstall();
        await rm(sandbox, { force: true, maxRetries: 10, recursive: true });
    }
}
