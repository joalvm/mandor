// Two copies of one origin on one disk: a shared repo, a link per machine, and the doors of the
// window that add the origin and bring it back in step.

import { execFile } from 'node:child_process';
import { mkdir, symlink, unlink as removeLink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { expect, type ElectronApplication, type Page } from '@playwright/test';

const run = promisify(execFile);

/** What the selector of the window calls the origin every machine starts with. */
export const LOCAL = 'Local';

/** The first branch the app gives an origin that had nothing: the one the repo is read at. */
const BRANCH = 'main';

/** What git answers over the repo, or nothing when it has nothing to answer yet. */
async function ask(bare: string, args: string[]): Promise<string> {
    try {
        const { stdout } = await run('git', ['-C', bare, ...args]);

        return stdout;
    } catch {
        return '';
    }
}

/** An empty repo no machine owns: the server both copies talk to, with no network in between. */
export async function makeSharedRepo(root: string): Promise<string> {
    const bare = join(root, 'shared');

    await mkdir(bare, { recursive: true });
    await run('git', ['init', '--bare', `--initial-branch=${BRANCH}`, bare]);

    return bare;
}

/**
 * The way one machine reaches the shared repo. A junction asks for no privilege on Windows and
 * is an ordinary link elsewhere; two links to one repo are two addresses of the same origin.
 * The address is what the dialog of the origins takes.
 */
export async function linkTo(bare: string, link: string): Promise<string> {
    await symlink(bare, link, 'junction');

    return pathToFileURL(link).href;
}

/** Cuts that machine off and leaves the other one alone: the link goes, the repo stays. */
export async function unlink(link: string): Promise<void> {
    await removeLink(link);
}

/** The subjects of every commit the shared repo holds, the last one first. */
export async function remoteLog(bare: string): Promise<string[]> {
    const out = await ask(bare, ['log', '--all', '--format=%s']);

    return out.split('\n').filter((line) => line !== '');
}

/**
 * The origin added from the page of origins, the way a user adds it: a name, an address, the
 * button. The dialog stays open to add another, so it is closed by hand once the row is there.
 */
export async function addOrigin(page: Page, input: { name: string; url: string }): Promise<void> {
    await page.getByRole('button', { exact: true, name: LOCAL }).click();
    await page.getByRole('menuitem', { name: 'Gestionar orígenes' }).click();
    await page.getByRole('button', { name: 'Añadir origen' }).click();

    const dialog = page.getByRole('dialog', { name: 'Añadir origen' });

    await dialog.getByRole('textbox', { name: 'Nombre' }).fill(input.name);
    await dialog.getByRole('textbox', { name: 'URL' }).fill(input.url);
    await dialog.getByRole('button', { exact: true, name: 'Añadir' }).click();

    await expect(
        page.locator('[data-part="origin-row"]').filter({ hasText: input.name }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
}

/** Moves the window into the origin of the menu: its copy opens, and the first sync starts. */
export async function switchToOrigin(page: Page, from: string, to: string): Promise<void> {
    await page.getByRole('button', { exact: true, name: from }).click();
    await page.getByRole('menu').getByText(to, { exact: true }).click();
    await expect(page.getByRole('button', { exact: true, name: to })).toBeVisible();
}

/**
 * The window takes the focus, which is what brings an origin up to date when nothing else did.
 * It is emitted instead of asked of the system: a desktop with no one at it may never grant it.
 */
export async function bringToFront(app: ElectronApplication): Promise<void> {
    await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.emit('focus');
    });
}
