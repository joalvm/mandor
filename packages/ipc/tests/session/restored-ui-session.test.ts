import { describe, expect, it } from 'vitest';

import { EMPTY_UI_SESSION, ROOT_GROUP_ID, restoredUiSessionSchema } from '../../src/index.js';

const PANELS = { sidebarWidth: 240, contentSplit: 58 } as const;

/** A session written by the version that shipped before groups existed. */
const V1_SESSION = {
    version: 1,
    activeWorkspaceId: 'payments',
    activeTabId: 'create-payment',
    tabs: [
        { id: 'overview', kind: 'doc', title: 'Overview' },
        { id: 'create-payment', kind: 'connection', title: 'Create payment' },
        { id: 'settings', kind: 'settings', title: 'Settings' },
    ],
    panels: PANELS,
} as const;

describe('restoring a session from disk', () => {
    it('turns a three tab v1 session into one group with the same active tab', () => {
        const session = restoredUiSessionSchema.parse(V1_SESSION);

        expect(session).toEqual({
            version: 2,
            activeWorkspaceId: 'payments',
            activeGroupId: ROOT_GROUP_ID,
            grid: {
                kind: 'leaf',
                id: ROOT_GROUP_ID,
                tabs: [
                    { id: 'overview', kind: 'doc', resource: 'mandor://_app/overview' },
                    {
                        id: 'create-payment',
                        kind: 'connection',
                        resource: 'mandor://_app/create-payment',
                    },
                    { id: 'settings', kind: 'settings', resource: 'mandor://_app/settings' },
                ],
                activeTab: 'create-payment',
            },
            panels: { ...PANELS, collapsedSections: [], splits: {} },
        });
    });

    it('drops a v1 active tab that named no tab of its own session', () => {
        const session = restoredUiSessionSchema.parse({ ...V1_SESSION, activeTabId: 'gone' });

        expect(session.grid).toMatchObject({ activeTab: null });
    });

    it('gives every migrated tab a resource of its own, even without a usable id', () => {
        const session = restoredUiSessionSchema.parse({
            ...V1_SESSION,
            activeTabId: null,
            tabs: [
                { id: '???', kind: 'doc', title: 'One' },
                { id: '!!!', kind: 'doc', title: 'Two' },
            ],
        });
        const resources = new Set(
            session.grid.kind === 'leaf' ? session.grid.tabs.map((tab) => tab.resource) : [],
        );

        expect(resources.size).toBe(2);
    });

    it('lets a session of the current version through untouched', () => {
        expect(restoredUiSessionSchema.parse(EMPTY_UI_SESSION)).toEqual(EMPTY_UI_SESSION);
    });

    it('falls back to one empty group on an unknown version, a broken file or nothing', () => {
        expect(restoredUiSessionSchema.parse({ ...V1_SESSION, version: 99 })).toEqual(
            EMPTY_UI_SESSION,
        );
        expect(restoredUiSessionSchema.parse({ tabs: 'many' })).toEqual(EMPTY_UI_SESSION);
        expect(restoredUiSessionSchema.parse(undefined)).toEqual(EMPTY_UI_SESSION);
    });
});
