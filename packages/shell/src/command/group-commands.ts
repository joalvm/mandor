import { leavesOf } from '@mandor/ipc';

import { fireAndForget } from '../fire-and-forget.js';
import type { Command } from './command-registry.js';
import type { ShellStore } from '../shell-store.js';

const CATEGORY = 'commands:categoryGroup';

/** How far the digit row of a keyboard reaches. Past it, the palette is the way in. */
const FOCUS_SLOTS = 9;

function groupCount(state: ShellStore): number {
    return leavesOf(state.grid).length;
}

/**
 * Focus by the place a group has in the window, one command per place. They are declared once
 * and appear only while the window has that many groups, so the palette never offers a seat
 * that is not there.
 */
function focusCommand(index: number): Command {
    return {
        category: CATEGORY,
        icon: 'arrow-inbound',
        id: `group.focus.${String(index)}`,
        run: (state) => {
            state.focusGroupAt(index - 1);
        },
        title: 'commands:focusGroup',
        titleValues: { index },
        when: (state) => groupCount(state) >= index,
    };
}

export const GROUP_COMMANDS: readonly Command[] = [
    {
        category: CATEGORY,
        icon: 'split-vertical',
        id: 'group.splitRight',
        run: (state) => {
            state.splitGroup(state.activeGroupId, 'row');
        },
        title: 'commands:splitRight',
    },
    {
        category: CATEGORY,
        icon: 'split-horizontal',
        id: 'group.splitDown',
        run: (state) => {
            state.splitGroup(state.activeGroupId, 'column');
        },
        title: 'commands:splitDown',
    },
    {
        category: CATEGORY,
        icon: 'close',
        id: 'group.close',
        run: (state) => {
            fireAndForget(state.requestCloseGroup(state.activeGroupId));
        },
        title: 'commands:closeGroup',
        when: (state) => groupCount(state) > 1,
    },
    {
        category: CATEGORY,
        icon: 'panel-maximize',
        id: 'group.toggleMaximized',
        run: (state) => {
            state.toggleMaximized();
        },
        title: 'commands:toggleMaximized',
        when: (state) => groupCount(state) > 1,
    },
    ...Array.from({ length: FOCUS_SLOTS }, (_unused, slot) => focusCommand(slot + 1)),
];
