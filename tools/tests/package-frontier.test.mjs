import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { repeatedNames, repeatedNotice } from '../frontier/repeated-symbols.mjs';

const PACKAGES = join(dirname(fileURLToPath(import.meta.url)), '../../packages');

/**
 * A name that carries `async`, `sync`, `connections` or `requests` names one of the two apps,
 * and what belongs to one app belongs inside it. `packages/` is what the two share.
 */
const APP_WORDS = /async|sync|connections|requests/;

/**
 * The exceptions, each with the reason it is one. They are pure: no screen, no window, only
 * bytes and formats. A protocol or a document format is not drawn, so it has no app to live in,
 * and whatever else comes to need it must not have to reach into an app. The reason is written
 * down because a whitelist without one grows by habit.
 */
const PURE_CORES = {
    'transport-async': 'moves WebSocket bytes: a protocol, not a screen',
    'transport-sync': 'moves HTTP bytes: a protocol, not a screen',
};

/** What a package cannot touch and stay pure: the two apps' own machinery. */
const NOT_PURE = ['react', 'react-dom', 'electron'];

async function packages() {
    const entries = await readdir(PACKAGES, { withFileTypes: true });

    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function sources(directory) {
    const entries = await readdir(directory, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name));

    return Promise.all(files.map((file) => readFile(join(file.parentPath, file.name), 'utf8')));
}

/** Everything the package names as a dependency plus everything its code imports by name. */
async function imported(name) {
    const manifest = JSON.parse(await readFile(join(PACKAGES, name, 'package.json'), 'utf8'));
    const declared = ['dependencies', 'devDependencies', 'peerDependencies'].flatMap((kind) =>
        Object.keys(manifest[kind] ?? {}),
    );
    const written = (await sources(join(PACKAGES, name, 'src'))).flatMap((source) => [
        ...source.matchAll(/from '([^']+)'/g),
    ]);

    return new Set([...declared, ...written.map(([, specifier]) => specifier)]);
}

describe('the frontier between packages and apps', () => {
    it('keeps app-specific names out of packages', async () => {
        const named = (await packages()).filter((name) => APP_WORDS.test(name));

        expect(named.filter((name) => !(name in PURE_CORES))).toEqual([]);
    });

    /**
     * The exception rests on the package being pure, so it has to expire on its own the day it
     * stops being so. A core that grows a component is a feature, and a feature picks an app.
     */
    it('withdraws the exception from a package that stops being pure', async () => {
        const excepted = (await packages()).filter((name) => name in PURE_CORES);
        const impure = [];

        for (const name of excepted) {
            const dependencies = await imported(name);

            if (NOT_PURE.some((forbidden) => dependencies.has(forbidden))) {
                impure.push(name);
            }
        }

        expect(impure).toEqual([]);
    });
});

/**
 * The frontier read the other way round. `packages/` holding a name of one app is an error and
 * has its own case above; two modules holding the same name is only a hint that something they
 * both do never went up, or went up twice. A module is a package or a feature of an app, since
 * the copies that drift live as much between two features, or two packages, as between the two
 * apps. It stays a hint: two modules can name two different things alike, and failing here would
 * be answered by inventing an ugly name.
 */
describe('what the modules repeat', () => {
    it('sees a name exported from the tree of either app', () => {
        const repeated = repeatedNames([
            {
                path: 'apps/async/src/renderer/open-request.ts',
                text: 'export function openRequest() {}',
            },
            {
                path: 'apps/sync/src/renderer/open-request.ts',
                text: 'export function openRequest() {}',
            },
            {
                path: 'apps/sync/src/renderer/send-request.ts',
                text: 'export const sendRequest = 1;',
            },
        ]);

        expect(repeated).toEqual([{ name: 'openRequest', modules: ['async', 'sync'] }]);
    });

    it('sees a name two features of one app export', () => {
        const repeated = repeatedNames([
            {
                path: 'apps/async/src/renderer/features/connections/lib/fire-and-forget.ts',
                text: 'export function fireAndForget() {}',
            },
            {
                path: 'apps/async/src/renderer/features/messages/lib/fire-and-forget.ts',
                text: 'export function fireAndForget() {}',
            },
        ]);

        expect(repeated).toEqual([
            { name: 'fireAndForget', modules: ['async/connections', 'async/messages'] },
        ]);
    });

    it('sees a name two packages export', () => {
        const repeated = repeatedNames([
            {
                path: 'packages/collections/src/lib/collection-place.ts',
                text: 'export function collectionPlace() {}',
            },
            {
                path: 'packages/store-fs/src/collection/collection-place.ts',
                text: 'export function collectionPlace() {}',
            },
        ]);

        expect(repeated).toEqual([
            { name: 'collectionPlace', modules: ['collections', 'store-fs'] },
        ]);
    });

    it('says nothing about a name a module hands on from its own barrel', () => {
        const repeated = repeatedNames([
            { path: 'packages/env/src/lib/hover.ts', text: 'export function variableHover() {}' },
            {
                path: 'packages/env/src/index.ts',
                text: "export { variableHover } from './lib/hover.js';",
            },
        ]);

        expect(repeated).toEqual([]);
    });

    it('says nothing about a name a single app exports', () => {
        const repeated = repeatedNames([
            {
                path: 'apps/async/src/renderer/open-connection.ts',
                text: 'export function openConnection() {}',
            },
        ]);

        expect(repeated).toEqual([]);
        expect(repeatedNotice(repeated)).toBeNull();
    });

    it('writes what it found without saying anything is broken', () => {
        const notice = repeatedNotice([{ name: 'openRequest', modules: ['async', 'sync'] }]);

        expect(notice).toContain('openRequest');
        expect(notice).toContain('async, sync');
    });
});
