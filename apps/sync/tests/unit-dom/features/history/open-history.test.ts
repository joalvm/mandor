import { selectTabs, shellStore } from '@mandor/shell';
import { afterEach, describe, expect, it } from 'vitest';

import {
    HISTORY_TAB_KIND,
    openHistory,
} from '../../../../src/renderer/features/history/lib/open-history.js';

afterEach(() => {
    shellStore.getState().reset();
});

function histories() {
    return selectTabs(shellStore.getState()).filter((tab) => tab.kind === HISTORY_TAB_KIND);
}

describe('opening the history', () => {
    it('does nothing while no workspace is open', () => {
        openHistory(shellStore.getState());

        expect(histories()).toHaveLength(0);
    });

    it('opens the history of the open workspace once, and goes back to it after', () => {
        shellStore.getState().setActiveWorkspace('demo');
        openHistory(shellStore.getState());
        openHistory(shellStore.getState());

        expect(histories()).toHaveLength(1);
    });
});
