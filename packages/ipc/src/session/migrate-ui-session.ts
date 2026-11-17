import { formatResourceUri, slugify } from '@mandor/schema';

import type { SessionTab } from './session-tab.js';
import { ROOT_GROUP_ID, type UiSession } from './ui-session.js';
import { uiSessionV1Schema, type UiSessionV1 } from './ui-session-v1.js';

/** Used when a v1 tab id has no letter or digit in it and cannot become a name. */
const UNNAMED_TAB = 'tab';

/**
 * Brings a stored session up to the current format, and hands anything it does not recognise
 * straight back: this decides nothing about validity, it only translates. It never throws,
 * because it runs inside the parse that is supposed to be the thing that fails.
 */
export function migrateUiSession(stored: unknown): unknown {
    const v1 = uiSessionV1Schema.safeParse(stored);

    return v1.success ? upgraded(v1.data) : stored;
}

function upgraded(v1: UiSessionV1): UiSession {
    const tabs = upgradedTabs(v1.tabs);
    const ids = new Set(tabs.map((tab) => tab.id));
    const activeTab = v1.activeTabId !== null && ids.has(v1.activeTabId) ? v1.activeTabId : null;

    return {
        version: 2,
        activeWorkspaceId: v1.activeWorkspaceId,
        activeGroupId: ROOT_GROUP_ID,
        grid: { kind: 'leaf', id: ROOT_GROUP_ID, tabs, activeTab },
        panels: { ...v1.panels },
    };
}

/**
 * v1 tabs name no resource, because the format predates them. Their ids become names in the
 * window scope, which is the honest answer: what they were looking at was never written down.
 * Each one gets its own name so that two of them do not end up sharing state later.
 */
function upgradedTabs(tabs: UiSessionV1['tabs']): SessionTab[] {
    const taken: string[] = [];

    return tabs.map((tab) => {
        const name = availableName(tab.id, taken);

        taken.push(name);

        return { id: tab.id, kind: tab.kind, resource: formatResourceUri({ scope: 'app', name }) };
    });
}

function availableName(tabId: string, taken: readonly string[]): string {
    try {
        return slugify(tabId, taken);
    } catch {
        return slugify(UNNAMED_TAB, taken);
    }
}
