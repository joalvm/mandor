import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { createConnection, expectFirstRun, ORIGIN_SLUG } from './first-run.js';
import { launch, type Sandbox } from './launch-app.js';

/** Four groups of five tabs: the window the budget is measured on. */
export const GROUPS = 4;
export const TABS_PER_GROUP = 5;

const SEED = 'seed';

/** Finds the one connections folder of the repo, so the layout on disk is read and not assumed. */
async function connectionsDir(repoRoot: string): Promise<string> {
    const found = await readdir(repoRoot, { recursive: true, withFileTypes: true });
    const dir = found.find((entry) => entry.isDirectory() && entry.name === 'connections');

    if (dir === undefined) {
        throw new Error('the repository has no connections folder to seed from');
    }

    return join(dir.parentPath, dir.name);
}

/** The workspace a path inside the repo belongs to, which the session has to name. */
function workspaceOf(connections: string): string {
    return basename(dirname(connections));
}

function tabId(index: number): string {
    return `${SEED}-${String(index).padStart(2, '0')}`;
}

/**
 * Twenty connections written from the one the window created, so the file on disk is the shape
 * the app writes and not a guess at it. The two that are dialled on the way back say so
 * themselves: the window opens what its files ask it to open, and nothing else.
 */
async function writeConnections(dir: string, live: number): Promise<void> {
    const [first] = await readdir(dir);

    if (first === undefined) {
        throw new Error('there is no connection to seed from');
    }

    const template = await readFile(join(dir, first), 'utf8');

    for (let index = 0; index < GROUPS * TABS_PER_GROUP; index += 1) {
        const id = tabId(index);
        const body = template
            .replace(/^id: .*$/m, `id: ${id}`)
            .replace(/^name: .*$/m, `name: ${id}`);
        const dialled = index < live ? `${body.trimEnd()}\nautoConnect: true\n` : body;

        await writeFile(join(dir, `${id}.yaml`), dialled, 'utf8');
    }
}

function groupOf(repo: string, workspace: string, index: number): string {
    const tabs = Array.from({ length: TABS_PER_GROUP }, (_unused, seat) => {
        const id = tabId(index * TABS_PER_GROUP + seat);

        return [
            `        - id: ${id}`,
            `          kind: connection`,
            `          resource: mandor://${repo}/${workspace}/connection/${id}`,
        ].join('\n');
    });

    return [
        `    - kind: leaf`,
        `      id: "${String(index)}"`,
        `      tabs:`,
        tabs.join('\n'),
        `      activeTab: ${tabId(index * TABS_PER_GROUP)}`,
    ].join('\n');
}

/** The session the window is asked to come back as: four groups side by side, five tabs each. */
async function writeSession(repoRoot: string, repo: string, workspace: string): Promise<void> {
    const groups = Array.from({ length: GROUPS }, (_unused, index) =>
        groupOf(repo, workspace, index),
    );
    const session = [
        'version: 2',
        `activeWorkspaceId: ${workspace}`,
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
 * Lays out the window the budget is measured on, with the app closed: twenty connections in
 * four groups, of which `live` are dialled when the window comes back.
 */
async function seedWorkload(repoRoot: string, repo: string, live: number): Promise<void> {
    const dir = await connectionsDir(repoRoot);

    await writeConnections(dir, live);
    await writeSession(repoRoot, repo, workspaceOf(dir));
}

/** Writes the workload to disk from a window that created exactly one connection, then closes. */
export async function layOutWorkload(sandbox: Sandbox, url: string, live: number): Promise<void> {
    const { defaultRepoRoot, repoRoot, userDataDir } = sandbox;
    const app = await launch(userDataDir, defaultRepoRoot);

    await expectFirstRun(app.page);
    await createConnection(app.page, 'seed', url, repoRoot);
    await app.app.close();
    await seedWorkload(repoRoot, ORIGIN_SLUG, live);
}

/** What the burst needs of the server: to send one text frame to every client. */
type Pusher = { broadcastText: (text: string) => void };

/** How many frames go out before the server gets a turn to flush: the burst has no clock. */
const FRAMES_PER_TURN = 250;

/** The last frame of a burst, short enough to be read whole in a row of the activity. */
export const END_OF_BURST = '{"end":true}';

/**
 * Pushes `count` frames of about `size` bytes to every client as fast as the server sends them,
 * and a last one that says the burst is over. The frames are numbered, like a stream of events,
 * so a window that drops one can be told from one that kept it.
 */
export async function pushMessages(server: Pusher, count: number, size: number): Promise<void> {
    const filler = 'x'.repeat(Math.max(0, size - 24));

    for (let sent = 0; sent < count; sent += 1) {
        server.broadcastText(`{"n":${String(sent)},"pad":"${filler}"}`);

        if (sent % FRAMES_PER_TURN === FRAMES_PER_TURN - 1) {
            await new Promise<void>((resolve) => {
                setImmediate(resolve);
            });
        }
    }

    server.broadcastText(END_OF_BURST);
}
