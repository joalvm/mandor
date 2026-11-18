import { useTranslator } from '@mandor/i18n';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    MenuShortcut,
} from '@mandor/ui';
import { Fragment, useMemo, type ReactElement, type ReactNode } from 'react';

import type { Command } from '../../command/command-registry.js';
import { atTab, canHoldDirty } from '../../command/tab-targets.js';
import { useShellStore } from '../../hooks/useShellStore.js';
import { isApplePlatform } from '../../shortcut/apple-platform.js';
import { DEFAULT_SHORTCUTS } from '../../shortcut/default-shortcuts.js';
import { shortcutLabel } from '../../shortcut/shortcut-label.js';
import { shortcutTable } from '../../shortcut/shortcut-table.js';
import { inFront, isAvailable, offeredOf, type MenuLine } from './tab-menu-commands.js';

type TabMenuProps = { children: ReactElement; groupId: string; tabId: string };

/**
 * Keeping and pinning are of some tabs only: a kept tab is never offered to be kept,
 * and a tab is offered to be pinned or to be let go, never both.
 */
const SECTIONS: readonly (readonly MenuLine[])[] = [
    [
        { id: 'tab.close' },
        { id: 'tab.closeOthers' },
        { id: 'tab.closeRight' },
        { id: 'tab.closeSaved', offered: canHoldDirty },
        { id: 'tab.closeAll' },
    ],
    [
        { id: 'tab.keepOpen', offered: isAvailable },
        { id: 'tab.pin', offered: isAvailable },
        { id: 'tab.unpin', offered: isAvailable },
    ],
    [{ id: 'tab.moveAside' }, { id: 'tab.openAside' }],
    [{ id: 'tab.reveal', offered: isAvailable }],
];

/**
 * What a right click on a tab offers, each line with its keys: the commands of the palette that
 * act on the tab in front, asked about this tab as if it were in front. A line runs on the tab
 * the menu was opened on, never on whichever one happened to be showing.
 *
 * The trigger is the pill itself. The keyboard opens it too: Shift+F10 and the menu key fire on
 * the element that holds the focus, which the group strip hands on to the pill.
 */
export function TabMenu({ children, groupId, tabId }: TabMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <TabMenuLines groupId={groupId} tabId={tabId} />
            </ContextMenuContent>
        </ContextMenu>
    );
}

type TabMenuLinesProps = { groupId: string; tabId: string };

function TabMenuLines({ groupId, tabId }: TabMenuLinesProps) {
    const state = useShellStore((each) => each);
    const target = atTab(state, groupId, tabId);
    const sections: ReactNode[][] = SECTIONS.map((lines) =>
        offeredOf(lines, target).map((command) => (
            <TabMenuLine
                command={command}
                disabled={!isAvailable(target, command)}
                groupId={groupId}
                key={command.id}
                tabId={tabId}
            />
        )),
    );

    return sections
        .filter((lines) => lines.length > 0)
        .map((lines, index) => (
            // The sections never move, so where one stands is what it is.
            <Fragment key={String(index)}>
                <SectionBreak first={index === 0} />
                {lines}
            </Fragment>
        ));
}

type TabMenuLineProps = { command: Command; disabled: boolean; groupId: string; tabId: string };

function TabMenuLine({ command, disabled, groupId, tabId }: TabMenuLineProps) {
    const translate = useTranslator();
    const keyboard = useMemo(() => shortcutTable(DEFAULT_SHORTCUTS), []);
    const combination = keyboard.get(command.id)?.combination;

    return (
        <ContextMenuItem
            disabled={disabled}
            onSelect={() => {
                command.run(inFront(groupId, tabId));
            }}
        >
            {translate(command.title, command.titleValues)}
            <LineShortcut combination={combination} />
        </ContextMenuItem>
    );
}

function SectionBreak({ first }: { first: boolean }) {
    if (first) {
        return null;
    }

    return <ContextMenuSeparator />;
}

function LineShortcut({ combination }: { combination: string | undefined }) {
    if (combination === undefined) {
        return null;
    }

    return <MenuShortcut>{shortcutLabel(combination, isApplePlatform())}</MenuShortcut>;
}
