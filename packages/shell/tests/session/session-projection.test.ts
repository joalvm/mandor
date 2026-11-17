import { EMPTY_UI_SESSION } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { initialShellData } from '../../src/shell-data.js';
import { sessionOf } from '../../src/session/session-projection.js';

describe('what the window writes down about itself', () => {
    it('writes the version, the workspace, the focused group and the grid as they are', () => {
        const data = { ...initialShellData(), activeWorkspaceId: 'payments' };
        const session = sessionOf(data);

        expect(session.version).toBe(2);
        expect(session.activeWorkspaceId).toBe('payments');
        expect(session.activeGroupId).toBe(data.activeGroupId);
        expect(session.grid).toBe(data.grid);
    });

    it('writes the panels, the tab state and the sections', () => {
        const data = {
            ...initialShellData(),
            panels: { ...EMPTY_UI_SESSION.panels, sidebarWidth: 321 },
            sections: { 'mandor://a': 'headers' },
            tabState: { a: { scroll: 4 } },
        };
        const session = sessionOf(data);

        expect(session.panels.sidebarWidth).toBe(321);
        expect(session.sections).toEqual({ 'mandor://a': 'headers' });
        expect(session.tabState).toEqual({ a: { scroll: 4 } });
    });

    it('copies what it writes, so a later change of the window does not reach a session in flight', () => {
        const sections: Record<string, string> = { 'mandor://a': 'headers' };
        const data = { ...initialShellData(), sections };
        const session = sessionOf(data);

        data.sections['mandor://b'] = 'body';

        expect(session.sections).toEqual({ 'mandor://a': 'headers' });
        expect(session.panels).not.toBe(data.panels);
        expect(session.tabState).not.toBe(data.tabState);
    });

    it('writes nothing of what is only for the moment', () => {
        const session = sessionOf({ ...initialShellData(), maximizedGroupId: 'root' });

        expect(Object.keys(session).toSorted()).toEqual([
            'activeGroupId',
            'activeWorkspaceId',
            'grid',
            'panels',
            'sections',
            'tabState',
            'version',
        ]);
    });
});
