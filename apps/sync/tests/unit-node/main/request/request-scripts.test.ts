import { createRequestItem, type FolderChainLevel } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { requestScripts } from '../../../../src/main/request/request-scripts.js';

const PLACE_OF: Record<FolderChainLevel['level'], (name: string) => FolderChainLevel['place']> = {
    workspace: () => ({ kind: 'workspace' }),
    collection: (name) => ({ kind: 'folder', path: name }),
    folder: (name) => ({ kind: 'folder', path: name }),
};

function group(
    level: FolderChainLevel['level'],
    name: string,
    settings: FolderChainLevel['settings'] = {},
): FolderChainLevel {
    return { level, place: PLACE_OF[level](name), name, settings };
}

// As the disk gives it: the closest level first, the workspace last.
const CHAIN: FolderChainLevel[] = [
    group('folder', 'Orders', {
        scripts: { onBeforeRequest: { source: 'orders()' }, onResponse: { source: 'after()' } },
    }),
    group('folder', 'Shop', { scripts: { onBeforeRequest: { source: 'shop()', enabled: false } } }),
    group('collection', 'Store', { scripts: { onBeforeRequest: { source: 'store()' } } }),
    group('workspace', 'Payments', {
        scripts: { onBeforeRequest: { source: 'never()' } },
    }),
];

const REQUEST = {
    ...createRequestItem({ name: 'List' }),
    scripts: { onBeforeRequest: { source: 'request()' } },
};

describe('requestScripts', () => {
    it('lists the collection, then each folder down, then the request', () => {
        const { entries } = requestScripts(CHAIN, REQUEST, 'onBeforeRequest');

        expect(entries).toEqual([
            {
                level: 'collection',
                name: 'Store',
                event: 'onBeforeRequest',
                source: 'store()',
                enabled: undefined,
            },
            {
                level: 'folder',
                name: 'Shop',
                event: 'onBeforeRequest',
                source: 'shop()',
                enabled: false,
            },
            {
                level: 'folder',
                name: 'Orders',
                event: 'onBeforeRequest',
                source: 'orders()',
                enabled: undefined,
            },
            {
                level: 'request',
                name: 'List',
                event: 'onBeforeRequest',
                source: 'request()',
                enabled: undefined,
            },
        ]);
    });

    it('takes only the scripts of the event asked', () => {
        const { entries } = requestScripts(CHAIN, REQUEST, 'onResponse');

        expect(entries.map(({ source }) => source)).toEqual(['after()']);
    });

    it('never lists a script of the workspace: it holds none of its own', () => {
        const before = requestScripts(CHAIN, REQUEST, 'onBeforeRequest');

        expect(before.entries.map(({ source }) => source)).not.toContain('never()');
    });

    it('runs nothing of a level that could not be read, and says so in the console', () => {
        const broken = { ...group('folder', 'Broken'), unreadable: true as const };
        const list = requestScripts([broken, ...CHAIN], REQUEST, 'onBeforeRequest');

        expect(list.entries.map(({ name }) => name)).not.toContain('Broken');
        expect(list.logs).toEqual([
            {
                level: 'warn',
                notice: 'folder-unreadable',
                params: { name: 'Broken' },
            },
        ]);
    });

    it('gives nothing to run for a request with no scripts above it or in it', () => {
        const bare = createRequestItem({ name: 'Bare' });

        expect(requestScripts([group('workspace', 'Payments')], bare, 'onBeforeRequest')).toEqual({
            entries: [],
            logs: [],
        });
    });
});
