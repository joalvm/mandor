import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { parse, stringify } from 'yaml';

import { atomicWrite } from '../disk/atomic-write.js';
import { readTextOrNull } from '../disk/read-text.js';
import { mandorDir } from '../repo/repo-path.js';

const ACTIVE_ENVIRONMENTS_FILE = 'active-environments.yaml';

export function activeEnvironmentsFile(root: string): string {
    return join(mandorDir(root), ACTIVE_ENVIRONMENTS_FILE);
}

/**
 * Reads private choices as untrusted data; the IPC owner validates its contract. A file that is
 * not YAML is no choice at all: picking again is cheap, and a broken file must not stop it. One
 * that is there and cannot be read fails, or the next write would drop every other choice.
 */
export async function readActiveEnvironments(root: string): Promise<unknown> {
    const source = await readTextOrNull(activeEnvironmentsFile(root));

    if (source === null) {
        return {};
    }

    try {
        return parse(source) as unknown;
    } catch {
        return {};
    }
}

/** Writes validated per-workspace choices atomically under the private directory. */
export async function writeActiveEnvironments(root: string, active: unknown): Promise<void> {
    const path = activeEnvironmentsFile(root);

    await mkdir(dirname(path), { recursive: true });
    await atomicWrite(path, stringify(active, { lineWidth: 0 }));
}
