import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { expect, type Page } from '@playwright/test';

import { diskTree, itemNamed, onDisk } from '../../../../../tools/workspace/disk-by-name.mjs';
import { PERSONAL, workspaceDir } from './disk-names.js';
import { launch, type Sandbox } from './launch-app.js';
import { nameNewRequest } from './send-flow.js';

/** Four groups of five tabs: the window the budget is measured on. */
export const GROUPS = 4;
export const TABS_PER_GROUP = 5;

const FOLDER = 'lote';
const TEMPLATE = 'seed';
const ORIGIN = 'local';

/** One request, made the way the user makes it: a folder of its own, the entry named in it. */
async function createTemplate(page: Page): Promise<void> {
    await expect(page.getByRole('button', { exact: true, name: 'Personal' })).toBeVisible();
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill(FOLDER);
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');

    const folder = page.getByRole('treeitem', { name: FOLDER });

    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New request' }).click();
    await nameNewRequest(page, TEMPLATE);
    await expect(page.getByRole('treeitem', { exact: true, name: TEMPLATE })).toBeVisible();
}

/**
 * Finds the file of the request the window wrote, so the layout on disk is read and not assumed:
 * its name is an id the app drew, so it is found by the names the screen shows.
 */
async function templateFile(repoRoot: string): Promise<string> {
    const collections = `${await workspaceDir(repoRoot, PERSONAL)}/collections`;
    const tree = diskTree(repoRoot);
    const names = [FOLDER, TEMPLATE];

    await expect.poll(() => itemNamed(tree, collections, names)).not.toBeNull();

    return join(
        repoRoot,
        onDisk(await itemNamed(tree, collections, names), 'the request to seed from'),
    );
}

function itemName(index: number): string {
    return `req-${String(index).padStart(2, '0')}`;
}

/** Where the requests live, by the ids the app drew: the workspace and the folder that holds them. */
type Place = { folder: string; workspace: string };

/** The place of a file: its folder is the directory it is in, its workspace three folders up. */
function placeOf(file: string): Place {
    return {
        folder: basename(dirname(file)),
        workspace: basename(dirname(dirname(dirname(file)))),
    };
}

/** The text of the template aimed at `url`: the line is replaced if it is there, added if not. */
function aimedAt(template: string, name: string, url: string): string {
    const named = template.replace(/^name: .*$/m, `name: ${name}`);

    return /^url:/m.test(named)
        ? named.replace(/^url:.*$/m, `url: ${url}`)
        : `${named.trimEnd()}\nurl: ${url}\n`;
}

function tabOf({ folder, workspace }: Place, index: number): string {
    const path = `${folder}/${itemName(index)}`;

    return [
        `        - id: item-${workspace}-${path}`,
        `          kind: item`,
        `          resource: mandor://${ORIGIN}/${workspace}/item/${path}`,
    ].join('\n');
}

function groupOf(place: Place, index: number): string {
    const first = index * TABS_PER_GROUP;
    const tabs = Array.from({ length: TABS_PER_GROUP }, (_unused, seat) =>
        tabOf(place, first + seat),
    );

    return [
        `    - kind: leaf`,
        `      id: "${String(index)}"`,
        `      tabs:`,
        tabs.join('\n'),
        `      activeTab: item-${place.workspace}-${place.folder}/${itemName(first)}`,
    ].join('\n');
}

/** The session the window is asked to come back as: four groups side by side, five tabs each. */
async function writeSession(repoRoot: string, place: Place): Promise<void> {
    const groups = Array.from({ length: GROUPS }, (_unused, index) => groupOf(place, index));
    const session = [
        'version: 2',
        `activeWorkspaceId: ${place.workspace}`,
        'activeGroupId: "0"',
        'grid:',
        '  kind: branch',
        '  axis: row',
        `  sizes: [${Array.from({ length: GROUPS }, () => '25').join(', ')}]`,
        '  children:',
        groups.join('\n'),
        'panels:',
        '  sidebarWidth: 260',
        '  contentSplit: 50',
        '',
    ].join('\n');
    const path = join(repoRoot, '.mandor', 'session.yaml');

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, session, 'utf8');
}

/**
 * Lays out the window the budget is measured on, with the app closed: twenty requests in one
 * folder, all aimed at `url`, in four groups of five. They are written from the one the window
 * created, so each file is the shape the app writes and not a guess at it.
 */
export async function layOutWorkload(sandbox: Sandbox, url: string): Promise<void> {
    const { defaultRepoRoot, repoRoot, userDataDir } = sandbox;
    const window = await launch(userDataDir, defaultRepoRoot);

    await createTemplate(window.page);
    await window.app.close();

    const seed = await templateFile(repoRoot);
    const template = await readFile(seed, 'utf8');

    for (let index = 0; index < GROUPS * TABS_PER_GROUP; index += 1) {
        const name = itemName(index);

        await writeFile(join(dirname(seed), `${name}.yaml`), aimedAt(template, name, url), 'utf8');
    }

    await writeSession(repoRoot, placeOf(seed));
}
