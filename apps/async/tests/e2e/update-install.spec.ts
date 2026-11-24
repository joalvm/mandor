import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
    executableIn,
    install,
    installerIn,
    openInstalled,
    type OpenApp,
} from './support/installed-app.js';
import { serveFeed, type FeedServer } from './support/update-feed-server.js';

const PAIR = process.env['MANDOR_UPDATE_PAIR'] ?? '';

// skip-policy: it needs the installer pair that tools/update/build-update-pair.mjs builds.
test.skip(PAIR === '', 'MANDOR_UPDATE_PAIR does not point to the pair of installers');

// The budget is longer than the others: an installer, a download and a second start are one flow of real programs; a
// hosted Windows runner needs minutes for it, and a shorter budget would only hide a slow runner.
test.setTimeout(5 * 60_000);

/** The channel file the updater asks for: the beta channel, whose name carries the system. */
const CHANNEL_FILE = process.platform === 'win32' ? '/beta.yml' : '/beta-linux.yml';

async function chooseSetting(page: Page, label: string, option: string): Promise<void> {
    await page.getByRole('combobox', { exact: true, name: label }).click();
    await page.getByRole('option', { exact: true, name: option }).click();
}

/** What a person sets before waiting for a version: the beta channel, taken automatically. */
async function setUpUpdates(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Settings' }).click();
    await page.getByRole('option', { name: 'Themes' }).click();
    await chooseSetting(page, 'Appearance', 'Hold one theme');
    await chooseSetting(page, 'Theme', 'Dark');
    await page.getByRole('option', { name: 'Updates' }).click();
    await chooseSetting(page, 'Channel', 'Beta');
    await chooseSetting(page, 'Updates', 'Automatic');
    await page.getByRole('button', { name: 'Check for updates' }).click();
    // The download is announced in the status line, which the open settings hide from the rest of
    // the window: they are closed once the check has started.
    await page.getByRole('button', { name: 'Close settings' }).click();
}

async function currentVersion(page: Page): Promise<string> {
    return page.evaluate(async () => {
        const result = await window.mandor.update.state();

        if (!result.ok) {
            throw new Error(result.error.message);
        }

        return result.value.current;
    });
}

/**
 * The installer of Windows runs on its own after the app has gone: it is waited for by name. The
 * table of `tasklist` cuts a name at 25 characters, and the one of the installer is longer: the
 * list is read as CSV, which writes it whole.
 */
function installerRunning(name: string): boolean {
    if (process.platform !== 'win32') {
        return false;
    }

    return spawnSync('tasklist', ['/FI', `IMAGENAME eq ${name}`, '/FO', 'CSV', '/NH'])
        .stdout.toString()
        .includes(`"${name}"`);
}

/** The folder of `updaterCacheDirName`, under the cache of the system as the updater finds it. */
function updaterCache(): string {
    const name = '@mandorasync-updater';

    if (process.platform === 'win32') {
        return join(process.env['LOCALAPPDATA'] ?? join(homedir(), 'AppData', 'Local'), name);
    }

    return join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), name);
}

async function closeAll(app: OpenApp | undefined): Promise<void> {
    if (app !== undefined) {
        await app.close();
    }
}

/** The beta takes the stable from the feed, and the person is offered the restart. */
async function expectDownloaded(page: Page, feed: FeedServer, installer: string): Promise<void> {
    // The installer comes from a local feed, but a runner may take its time to write it to disk.
    await expect(page.getByRole('button', { name: 'Restart to update' })).toBeVisible({
        timeout: 60_000,
    });
    expect(feed.requests).toContain(CHANNEL_FILE);
    expect(feed.requests).toContain(`/${basename(installer)}`);
}

/** What the person finds after the update: the new version, what was set, and the updater's trace. */
async function expectUpdated(page: Page, userData: string, stable: string): Promise<void> {
    expect(await currentVersion(page)).toBe(stable);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await readFile(join(userData, 'mandor.log'), 'utf8')).toContain('updater:');
}

test('an installed beta finds the stable, installs it on quit and keeps what the person set', async () => {
    // A version a run before downloaded is taken from the cache without asking the feed, and a
    // retry would never see the download: the cache goes first.
    await rm(updaterCache(), { force: true, recursive: true });

    const sandbox = await mkdtemp(join(tmpdir(), 'mandor-async-update-'));
    const userData = join(sandbox, 'data');
    const feed = await serveFeed(join(PAIR, 'feed'));
    const installer = await installerIn(join(PAIR, 'feed'));
    const installed = await install(await installerIn(join(PAIR, 'from')), sandbox);
    let app: OpenApp | undefined;

    try {
        app = await openInstalled(await executableIn(installed.directory), userData);
        await setUpUpdates(app.page);
        await expectDownloaded(app.page, feed, installer);

        await app.quit();
        // The installer takes the old version out before it writes the new one, which a hosted
        // runner may need a minute for.
        await expect
            .poll(() => installerRunning(basename(installer)), { timeout: 120_000 })
            .toBe(false);

        app = await openInstalled(await executableIn(installed.directory), userData);
        await expectUpdated(app.page, userData, await versionOfFeed(PAIR));
    } finally {
        await closeAll(app);
        await feed.close();
        await installed.uninstall();
        await rm(sandbox, { force: true, maxRetries: 10, recursive: true });
    }
});

/** The version the feed announces, read from its channel file as the updater reads it. */
async function versionOfFeed(pair: string): Promise<string> {
    const file = process.platform === 'win32' ? 'latest.yml' : 'latest-linux.yml';
    const text = await readFile(join(pair, 'feed', file), 'utf8');
    const version = /^version:\s*(\S+)/m.exec(text)?.[1];

    if (version === undefined) {
        throw new Error(`${file} does not name a version`);
    }

    return version;
}
