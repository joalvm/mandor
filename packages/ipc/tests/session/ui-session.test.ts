import { describe, expect, it } from 'vitest';

import {
    sessionLoadRequestSchema,
    sessionSaveRequestSchema,
    uiSessionSchema,
    type UiSession,
} from '../../src/index.js';

const OVERVIEW = {
    id: 'overview',
    kind: 'doc',
    resource: 'mandor://demo/payments/doc/overview.md',
} as const;

const CHARGES = {
    id: 'charges',
    kind: 'doc',
    resource: 'mandor://demo/payments/doc/charges.md',
} as const;

const SESSION = {
    version: 2,
    activeWorkspaceId: 'payments',
    activeGroupId: 'left',
    grid: {
        kind: 'branch',
        axis: 'row',
        sizes: [50, 50],
        children: [
            { kind: 'leaf', id: 'left', tabs: [OVERVIEW], activeTab: 'overview' },
            { kind: 'leaf', id: 'right', tabs: [CHARGES], activeTab: 'charges' },
        ],
    },
    panels: {
        sidebarWidth: 240,
        contentSplit: 58,
        collapsedSections: ['docs'],
        splits: {},
    },
} as const satisfies UiSession;

function withGrid(grid: unknown): unknown {
    return { ...SESSION, grid };
}

describe('the UI session contract', () => {
    it('accepts a split session at both request shapes', () => {
        expect(uiSessionSchema.parse(SESSION)).toEqual(SESSION);
        expect(sessionLoadRequestSchema.parse({})).toEqual({});
        expect(sessionSaveRequestSchema.parse({ session: SESSION })).toEqual({ session: SESSION });
    });

    it('accepts a single group, empty and with no active tab', () => {
        const alone = {
            ...SESSION,
            activeGroupId: 'root',
            grid: { kind: 'leaf', id: 'root', tabs: [], activeTab: null },
        };

        expect(uiSessionSchema.safeParse(alone).success).toBe(true);
    });

    it('refuses two groups sharing an id', () => {
        const twins = withGrid({
            ...SESSION.grid,
            children: [
                { kind: 'leaf', id: 'left', tabs: [OVERVIEW], activeTab: 'overview' },
                { kind: 'leaf', id: 'left', tabs: [], activeTab: null },
            ],
        });

        expect(uiSessionSchema.safeParse(twins).success).toBe(false);
    });

    it('refuses the same tab id in two groups', () => {
        const twins = withGrid({
            ...SESSION.grid,
            children: [
                { kind: 'leaf', id: 'left', tabs: [OVERVIEW], activeTab: 'overview' },
                { kind: 'leaf', id: 'right', tabs: [OVERVIEW], activeTab: 'overview' },
            ],
        });

        expect(uiSessionSchema.safeParse(twins).success).toBe(false);
    });

    it('refuses an active tab that is not in its own group', () => {
        const stray = withGrid({
            ...SESSION.grid,
            children: [
                { kind: 'leaf', id: 'left', tabs: [OVERVIEW], activeTab: 'charges' },
                { kind: 'leaf', id: 'right', tabs: [CHARGES], activeTab: 'charges' },
            ],
        });
        const empty = withGrid({
            ...SESSION.grid,
            children: [
                { kind: 'leaf', id: 'left', tabs: [], activeTab: 'overview' },
                { kind: 'leaf', id: 'right', tabs: [CHARGES], activeTab: 'charges' },
            ],
        });

        expect(uiSessionSchema.safeParse(stray).success).toBe(false);
        expect(uiSessionSchema.safeParse(empty).success).toBe(false);
    });

    it('refuses a branch whose sizes do not match its children', () => {
        expect(uiSessionSchema.safeParse(withGrid({ ...SESSION.grid, sizes: [50] })).success).toBe(
            false,
        );
    });

    it('refuses an active group that no leaf answers to', () => {
        expect(uiSessionSchema.safeParse({ ...SESSION, activeGroupId: 'nowhere' }).success).toBe(
            false,
        );
    });

    it('refuses a tab whose resource names nothing Mandor can open', () => {
        const foreign = withGrid({
            ...SESSION.grid,
            children: [
                {
                    kind: 'leaf',
                    id: 'left',
                    tabs: [{ ...OVERVIEW, resource: 'https://example.com/overview.md' }],
                    activeTab: 'overview',
                },
                { kind: 'leaf', id: 'right', tabs: [CHARGES], activeTab: 'charges' },
            ],
        });

        expect(uiSessionSchema.safeParse(foreign).success).toBe(false);
    });

    /** Folding a section is a preference of the window, so it travels with the rest of it. */
    it('carries the sections the user left folded', () => {
        const folded = uiSessionSchema.parse(SESSION);

        expect(folded.panels.collapsedSections).toEqual(['docs']);
    });

    /**
     * The bag of state per tab travels as it is, whatever the app that wrote a key put in it.
     * A session from before the bag existed comes back without one, and nothing of the window
     * is lost for it.
     */
    it('carries the state each tab holds, and an older session without it comes back without it', () => {
        const carrying = uiSessionSchema.parse({
            ...SESSION,
            tabState: { 'conn-1': { payload: 'hola' } },
        });

        expect(carrying.tabState).toEqual({ 'conn-1': { payload: 'hola' } });

        expect(uiSessionSchema.parse(SESSION).tabState).toBeUndefined();
    });

    /** A session written before sections existed opens with everything unfolded, not lost. */
    it('gives an older session an empty list of folded sections', () => {
        const older = {
            ...SESSION,
            panels: { sidebarWidth: 240, contentSplit: 58 },
        };
        const parsed = uiSessionSchema.parse(older);

        expect(parsed.panels.collapsedSections).toEqual([]);
    });

    it('refuses the previous version of the format', () => {
        const v1 = {
            version: 1,
            activeWorkspaceId: 'payments',
            activeTabId: null,
            tabs: [],
            panels: SESSION.panels,
        };

        expect(uiSessionSchema.safeParse(v1).success).toBe(false);
    });
});
