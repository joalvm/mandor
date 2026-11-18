import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function posix(path) {
    return path.split(sep).join('/');
}

const CODE = /\.(ts|tsx|css|html|json)$/;
const SKIP = /(^|[\\/])(node_modules|dist|out|\.turbo|coverage)([\\/]|$)/;
const ALLOWED = [
    /^packages[\\/]icons[\\/]/,
    /^tools[\\/]eslint-rules[\\/]no-foreign-icon-source\.js$/,
    /^tools[\\/]tests[\\/](eslint-rules[\\/])?no-foreign-icon-source\.test\.mjs$/,
    /^tools[\\/]tests[\\/]icon-provider-boundary\.test\.mjs$/,
];
const LOCK = /(^|[\\/])package-lock\.json$/;

/** What a file may never say, each with the boundary it breaks. */
const BANNED = [
    [/@vscode\/codicons/, 'el proveedor solo se lee desde packages/icons'],
    [/codicon\.(css|ttf|csv|codepoints|html)/, 'los recursos del proveedor no entran al producto'],
    [/codicon-[a-z]/, 'las clases de la fuente del proveedor no se usan'],
    [/<Icon name="[a-z-]+"/, 'Icon resuelve datos; un literal importa el componente'],
    [/['"]@mandor\/icons\//, 'icons no tiene deep imports: su barril es único'],
];

async function filesUnder(root, base = '') {
    const entries = await readdir(root, { withFileTypes: true });
    const found = [];

    for (const entry of entries) {
        const path = posix(join(base, entry.name));

        if (SKIP.test(path)) {
            continue;
        }

        if (entry.isDirectory()) {
            found.push(...(await filesUnder(join(root, entry.name), path)));
            continue;
        }

        if (CODE.test(entry.name) && !LOCK.test(path) && !ALLOWED.some((each) => each.test(path))) {
            found.push({ content: await readFile(join(root, entry.name), 'utf8'), path });
        }
    }

    return found;
}

function assertClean(path, content) {
    for (const [pattern, boundary] of BANNED) {
        if (pattern.test(content)) {
            throw new Error(`${path}: ${boundary}`);
        }
    }
}

describe('the icon provider boundary', () => {
    it('keeps Codicons, its resources and its resolver behind packages/icons', async () => {
        const files = [
            ...(await filesUnder(join(ROOT, 'packages'), 'packages')),
            ...(await filesUnder(join(ROOT, 'apps'), 'apps')),
        ];

        expect(files.length).toBeGreaterThan(500);

        for (const { path, content } of files) {
            assertClean(path, content);
        }
    });
});
