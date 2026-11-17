import { cleanup, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { workspacePanelActionDeclarations } from '../src/panel-actions.js';

/** Ids no other file declares: the registry outlives a file, and the place of an id is forever. */
const FIRST = 'panel-actions-first';
const SECOND = 'panel-actions-second';

function Listed() {
    const declared = useSyncExternalStore(
        workspacePanelActionDeclarations.subscribe,
        workspacePanelActionDeclarations.list,
    );

    return <p>{declared.map((each) => each.id).join(',')}</p>;
}

afterEach(() => {
    cleanup();
});

describe('the registry of actions beside the workspace form', () => {
    it('answers what an app declared, and tells who is listening', () => {
        const heard = vi.fn();
        const stopListening = workspacePanelActionDeclarations.subscribe(heard);
        const stop = workspacePanelActionDeclarations.declare({ id: FIRST });

        stopListening();

        expect(workspacePanelActionDeclarations.get(FIRST)).toEqual({ id: FIRST });
        expect(heard).toHaveBeenCalledTimes(1);

        stop();
    });

    it('lists the actions in the order each first arrived', () => {
        const stops = [FIRST, SECOND].map((id) => workspacePanelActionDeclarations.declare({ id }));

        const view = render(<Listed />);

        expect(screen.getByText(new RegExp(`${FIRST},${SECOND}$`, 'u'))).toBeVisible();

        // The page goes first: letting go of a declaration under a mounted page is an update outside act.
        view.unmount();

        for (const stop of stops) {
            stop();
        }
    });

    it('forgets an action once it is let go of', () => {
        const stop = workspacePanelActionDeclarations.declare({ id: 'panel-actions-gone' });

        stop();

        expect(workspacePanelActionDeclarations.get('panel-actions-gone')).toBeUndefined();
    });
});
