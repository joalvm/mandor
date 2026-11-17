import { describe, expect, it } from 'vitest';

import { uiSessionV1Schema } from '../../src/session/ui-session-v1.js';

const V1 = {
    version: 1,
    activeWorkspaceId: 'payments',
    activeTabId: 'overview',
    tabs: [{ id: 'overview', kind: 'doc', title: 'Overview' }],
    panels: { sidebarWidth: 240, contentSplit: 58, collapsedSections: [], splits: {} },
};

describe('uiSessionV1Schema', () => {
    it('reads a session of the flat strip, with its titles', () => {
        expect(uiSessionV1Schema.parse(V1)).toEqual(V1);
    });

    it('reads a session with nothing open', () => {
        const empty = { ...V1, activeWorkspaceId: null, activeTabId: null, tabs: [] };

        expect(uiSessionV1Schema.parse(empty)).toEqual(empty);
    });

    it('refuses any other version', () => {
        expect(uiSessionV1Schema.safeParse({ ...V1, version: 2 }).success).toBe(false);
    });

    it('refuses a tab whose id or title is blank', () => {
        const blankId = { ...V1, tabs: [{ id: '  ', kind: 'doc', title: 'Overview' }] };
        const blankTitle = { ...V1, tabs: [{ id: 'overview', kind: 'doc', title: '' }] };

        expect(uiSessionV1Schema.safeParse(blankId).success).toBe(false);
        expect(uiSessionV1Schema.safeParse(blankTitle).success).toBe(false);
    });

    it('refuses a key it never wrote, on the session and on a tab', () => {
        const onSession = { ...V1, grid: null };
        const onTab = { ...V1, tabs: [{ ...V1.tabs[0], pinned: true }] };

        expect(uiSessionV1Schema.safeParse(onSession).success).toBe(false);
        expect(uiSessionV1Schema.safeParse(onTab).success).toBe(false);
    });

    it('lets a drag that no longer fits fall back to the default instead of failing', () => {
        const parsed = uiSessionV1Schema.parse({
            ...V1,
            panels: { sidebarWidth: 9000, contentSplit: 58 },
        });

        expect(parsed.panels.sidebarWidth).toBe(260);
        expect(parsed.panels.collapsedSections).toEqual([]);
    });
});
