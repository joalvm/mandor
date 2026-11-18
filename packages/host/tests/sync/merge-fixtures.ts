import type { ChangedEntity } from '@mandor/schema';

import type { MergeDivergenceDeps } from '../../src/sync/merge-divergence.js';

export const ITEM = 'workspaces/pagos/collections/login.yaml';
export const NOTES = 'workspaces/pagos/docs/notes.md';
export const WORKSPACE = 'workspaces/pagos/workspace.yaml';

export function request(method: string, url: string): string {
    return `name: Login\nmethod: ${method}\nurl: ${url}\nheaders: []\n`;
}

export const SEED = {
    [ITEM]: request('POST', '/login'),
    [NOTES]: 'one\ntwo\nthree\n',
    [WORKSPACE]: 'name: Pagos\n',
};

/** The window and the log of a merge, as lists to read afterwards. */
export function depsOf(): {
    pushed: ChangedEntity[][];
    warned: string[];
    deps: MergeDivergenceDeps;
} {
    const pushed: ChangedEntity[][] = [];
    const warned: string[] = [];

    return {
        pushed,
        warned,
        deps: {
            push: (entities) => pushed.push(entities),
            warn: (message) => warned.push(message),
        },
    };
}
