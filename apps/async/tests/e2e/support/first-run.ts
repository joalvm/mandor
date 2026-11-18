import { expect, type Page } from '@playwright/test';

import {
    diskTree,
    entityNamed,
    onDisk,
    workspaceNamed,
} from '../../../../../tools/workspace/disk-by-name.mjs';

/**
 * The workspace the app lays out by itself on the first run, and the segment the resource
 * URIs of the local origin are written under. Both mirror the i18n defaults
 * (`workspace:defaultName` and the name of the local origin); nobody types them in these runs.
 */
export const DEFAULT_WORKSPACE = 'Personal';
export const ORIGIN_SLUG = 'local';

/**
 * The first run is already done when the window is up: the app opened the local origin and
 * its one workspace. The wait is the assertion — until the workspace names itself, every form
 * on screen would still be writing to no origin at all.
 */
export async function expectFirstRun(page: Page): Promise<void> {
    await expect(page.getByRole('button', { name: DEFAULT_WORKSPACE })).toBeVisible();
}

/**
 * Creates one connection from the add action of its section: the connection exists from the
 * first click and its tab opens with the URL in focus. Its row menu names it, which retitles the
 * tab, and the URL is written over its starting value in the composer below.
 *
 * The save pauses while the typing settles, and the run does not go on until the pause is
 * over: `repoRoot` is where the run looks for the file, and everything after this reads the
 * disk a relaunch will read, not whatever the window still owes it.
 */
export async function createConnection(
    page: Page,
    name: string,
    url: string,
    repoRoot: string,
): Promise<void> {
    await page.getByRole('button', { name: 'New connection' }).click();

    const urlField = page.getByRole('textbox', { name: 'Connection URL' });

    await expect(urlField).toBeFocused();
    await page
        .getByRole('option', { name: /New connection/, selected: true })
        .getByRole('button', { name: 'Connection actions' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: 'Rename' }).click();

    const nameField = page.getByRole('textbox', { name: 'Connection name' });

    await expect(nameField).toBeVisible();
    await nameField.press('ControlOrMeta+a');
    await nameField.pressSequentially(name);
    await nameField.press('Enter');
    await expect(page.getByRole('tab', { name })).toBeVisible();
    await urlField.click();
    await urlField.press('ControlOrMeta+a');
    await urlField.pressSequentially(url);
    await expect(urlField).toContainText(url);
    await expectConnectionOnDisk(repoRoot, name, url);
}

/**
 * Where the workspace of the first run lives in the repo: its directory is an id the app drew,
 * so it is found by the name the screen shows.
 */
export async function defaultWorkspaceDir(repoRoot: string): Promise<string> {
    return onDisk(
        await workspaceNamed(diskTree(repoRoot), DEFAULT_WORKSPACE),
        'the workspace of the first run',
    );
}

/** The change is on disk when the connection of that name carries the url as well. */
async function expectConnectionOnDisk(repoRoot: string, name: string, url: string): Promise<void> {
    const tree = diskTree(repoRoot);

    await expect
        .poll(async () => {
            const workspace = await defaultWorkspaceDir(repoRoot).catch(() => '');
            const file = await entityNamed(tree, `${workspace}/connections`, name);

            return file !== null && (await tree.read(file)).includes(`url: ${url}`);
        })
        .toBe(true);
}
