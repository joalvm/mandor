import { describe, expect, it, vi } from 'vitest';

import { tabPointingOf } from '../../src/grid/tab-pointing.js';

type Heard = (event: {
    origin: 'user' | 'api';
    panel: { group: { id: string }; id: string } | undefined;
}) => void;

/** An api of the test that keeps the listeners the way a real emitter does. */
function apiOf(): {
    api: Parameters<typeof tabPointingOf>[0];
    fire: (event: Parameters<Heard>[0]) => void;
} {
    const listeners: Heard[] = [];
    const api = {
        onDidActivePanelChange: (handler: Heard) => {
            listeners.push(handler);

            return {
                dispose: () => {
                    listeners.splice(listeners.indexOf(handler), 1);
                },
            };
        },
    };

    return {
        api,
        fire: (event) => {
            for (const heard of [...listeners]) {
                heard(event);
            }
        },
    };
}

function panelOf(groupId: string, tabId: string) {
    return { group: { id: groupId }, id: tabId };
}

describe('the tab the user put in front', () => {
    it('names the group and the tab, so the tree writes both down', () => {
        const { api, fire } = apiOf();
        const pointed = vi.fn();

        tabPointingOf(api, pointed);
        fire({ origin: 'user', panel: panelOf('group-2', 'tab-b') });

        expect(pointed).toHaveBeenCalledWith('group-2', 'tab-b');
    });

    it('says nothing of a tab with no group, as when the window has none yet', () => {
        const { api, fire } = apiOf();
        const pointed = vi.fn();

        tabPointingOf(api, pointed);
        fire({ origin: 'user', panel: undefined });

        expect(pointed).not.toHaveBeenCalled();
    });

    it('leaves alone what the tree itself made the view show', () => {
        const { api, fire } = apiOf();
        const pointed = vi.fn();

        tabPointingOf(api, pointed);
        fire({ origin: 'api', panel: panelOf('root', 'tab-a') });

        expect(pointed).not.toHaveBeenCalled();
    });

    it('hears no more once it is let go', () => {
        const { api, fire } = apiOf();
        const pointed = vi.fn();

        tabPointingOf(api, pointed)();
        fire({ origin: 'user', panel: panelOf('root', 'tab-a') });

        expect(pointed).not.toHaveBeenCalled();
    });
});
