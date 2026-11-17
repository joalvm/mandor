import type { IconName } from '@mandor/ui';

import { windowSurface } from './window-surface.js';
import type { Command } from './command-registry.js';

type Surfaced = { category: string; icon: IconName; id: string; surface: string; title: string };

/** The palette is a surface of the window like any other, so it is reached the same way. */
export const PALETTE_SURFACE = 'commandPalette';

/** The centre of notices, whose bell hangs from the status line. */
export const NOTICES_SURFACE = 'notices';

const SURFACED: readonly Surfaced[] = [
    {
        category: 'commands:categoryWorkspace',
        icon: 'search',
        id: 'workspace.search',
        surface: 'search',
        title: 'commands:searchWorkspace',
    },
    {
        category: 'commands:categoryWindow',
        icon: 'search',
        id: 'shell.commandPalette',
        surface: PALETTE_SURFACE,
        title: 'commands:commandPalette',
    },
    {
        category: 'commands:categoryWindow',
        icon: 'settings',
        id: 'shell.openSettings',
        surface: 'settings',
        title: 'commands:openSettings',
    },
    {
        category: 'commands:categoryWindow',
        icon: 'info',
        id: 'shell.openActivity',
        surface: 'activity',
        title: 'commands:openActivity',
    },
    {
        category: 'commands:categoryWindow',
        icon: 'bell',
        id: 'shell.showNotices',
        surface: NOTICES_SURFACE,
        title: 'commands:showNotices',
    },
    {
        category: 'commands:categoryWindow',
        icon: 'origin-remote',
        id: 'shell.openOrigins',
        surface: 'origins',
        title: 'commands:openOrigins',
    },
    {
        category: 'commands:categoryWorkspace',
        icon: 'workspace',
        id: 'workspace.switch',
        surface: 'workspaces',
        title: 'commands:switchWorkspace',
    },
];

/**
 * The command exists from the moment the workbench promises the action, and applies from the
 * moment somebody answers for it. Until then it is declared and unavailable, which is what keeps
 * the palette a list of what can be done and the promise a thing that can be counted.
 */
function surfaceCommand({ category, icon, id, surface, title }: Surfaced): Command {
    return {
        category,
        icon,
        id,
        run: (state) => {
            windowSurface(surface)?.open(state);
        },
        title,
        when: () => windowSurface(surface) !== undefined,
    };
}

export const WINDOW_COMMANDS: readonly Command[] = SURFACED.map(surfaceCommand);
