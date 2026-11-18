import { describe, expect, it } from 'vitest';

import { migrateUiSession } from '../../src/session/migrate-ui-session.js';
import { uiSessionSchema } from '../../src/session/ui-session.js';

const PANELS = { sidebarWidth: 240, contentSplit: 58, collapsedSections: ['docs'], splits: {} };

function v1(tabs: { id: string }[], activeTabId: string | null): unknown {
    return {
        version: 1,
        activeWorkspaceId: 'payments',
        activeTabId,
        tabs: tabs.map((tab) => ({ ...tab, kind: 'doc', title: 'Title' })),
        panels: PANELS,
    };
}

describe('migrateUiSession', () => {
    it('brings a flat strip of tabs into one group, the root, with the same tab active', () => {
        const migrated = migrateUiSession(v1([{ id: 'overview' }, { id: 'charges' }], 'charges'));

        expect(migrated).toEqual({
            version: 2,
            activeWorkspaceId: 'payments',
            activeGroupId: 'root',
            grid: {
                kind: 'leaf',
                id: 'root',
                tabs: [
                    { id: 'overview', kind: 'doc', resource: 'mandor://_app/overview' },
                    { id: 'charges', kind: 'doc', resource: 'mandor://_app/charges' },
                ],
                activeTab: 'charges',
            },
            panels: PANELS,
        });
    });

    it('produces a session the current format accepts', () => {
        const migrated = migrateUiSession(v1([{ id: 'overview' }], 'overview'));

        expect(uiSessionSchema.safeParse(migrated).success).toBe(true);
    });

    it('leaves no tab active when the one that was active is not among the tabs', () => {
        const migrated = migrateUiSession(v1([{ id: 'overview' }], 'gone'));

        expect(uiSessionSchema.parse(migrated).grid).toMatchObject({ activeTab: null });
    });

    it('gives each tab a name of its own, so two of them never share state', () => {
        const migrated = migrateUiSession(v1([{ id: 'Tab A' }, { id: 'tab-a' }], null));

        expect(uiSessionSchema.parse(migrated).grid).toMatchObject({
            tabs: [
                { id: 'Tab A', resource: 'mandor://_app/tab-a' },
                { id: 'tab-a', resource: 'mandor://_app/tab-a-2' },
            ],
        });
    });

    it('names a tab whose id has no letter or digit in it, and keeps those apart too', () => {
        const migrated = migrateUiSession(v1([{ id: '???' }, { id: '!!!' }], null));

        expect(uiSessionSchema.parse(migrated).grid).toMatchObject({
            tabs: [{ resource: 'mandor://_app/tab' }, { resource: 'mandor://_app/tab-2' }],
        });
    });

    it('hands back what it does not recognise, the very same value', () => {
        const current = { version: 2, anything: true };

        expect(migrateUiSession(current)).toBe(current);
        expect(migrateUiSession(null)).toBeNull();
        expect(migrateUiSession('text')).toBe('text');
    });

    it('hands back a v1 that is malformed instead of guessing: it decides nothing about validity', () => {
        const broken = { ...(v1([], null) as object), tabs: 'none' };

        expect(migrateUiSession(broken)).toBe(broken);
    });
});
