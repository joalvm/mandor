import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { dependencyRoots, noticesText, readEntry } from './third-party.mjs';

/** The parts of an Electron build, each of which notes what it bundled. */
const TARGETS = ['main', 'preload', 'renderer'];

function record(dir, target) {
    const path = join(dir, `bundled-${target}.json`);

    if (!existsSync(path)) {
        throw new Error(
            `The ${target} build left no record of what it bundled: build the app first.`,
        );
    }

    return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Writes `out/licenses/THIRD-PARTY-NOTICES.txt` for an app just built: the packages its bundles
 * hold, the ones those of the repo it bundles ask for, the ones its main loads from
 * `node_modules`, and Electron. Returns how many packages it lists.
 *
 * @param {string} appDir the folder of the app
 */
export function writeNotices(appDir) {
    const dir = join(appDir, 'out', 'licenses');
    const records = TARGETS.map((target) => record(dir, target));
    const workspaces = [...new Set(records.flatMap((each) => each.workspaces))];
    const electron = dirname(
        createRequire(join(appDir, 'package.json')).resolve('electron/package.json'),
    );
    const roots = new Set(
        [
            ...records.flatMap((each) => each.packages),
            ...dependencyRoots([appDir, ...workspaces]),
            electron,
        ].map((root) => root.replaceAll('\\', '/')),
    );

    writeFileSync(
        join(dir, 'THIRD-PARTY-NOTICES.txt'),
        noticesText([...roots].map(readEntry)),
        'utf8',
    );

    return roots.size;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const count = writeNotices(process.cwd());

    console.log(`Third-party notices: ${String(count)} packages.`);
}
