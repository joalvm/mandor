import { Icon } from '@mandor/icons';

import type { LabGroup } from '../nav.js';

type ShellSidebarProps = {
    activeId: string;
    /** La sección abierta: el lateral lista solo sus páginas, nunca las de las otras. */
    group: LabGroup;
};

type EntryState = 'current' | 'rest';

/** La página abierta se tiñe de acento, como el índice de una web de documentación. */
const ENTRY_CLASSES: Record<EntryState, string> = {
    current: 'bg-surface-accent-tint font-semibold text-text-accent hover:veil',
    rest: 'text-text-secondary hover:veil hover:text-text-primary',
};

const ENTRY_CURRENT: Record<EntryState, 'page' | undefined> = {
    current: 'page',
    rest: undefined,
};

/**
 * The navigation column: the name of the section and one row per page, in the order of the
 * index. Which section it lists is the composition root's decision; the active page is data it
 * hands in too.
 */
export function ShellSidebar({ activeId, group }: ShellSidebarProps) {
    return (
        <nav
            aria-label={group.label}
            className="flex w-64 flex-col gap-2 overflow-y-auto border-r border-border-subtle px-4 py-6"
            data-part="shell-sidebar"
        >
            <p className="px-3 text-xs font-semibold text-text-secondary">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
                {group.pages.map((entry) => {
                    const state: EntryState = entry.id === activeId ? 'current' : 'rest';

                    return (
                        <li key={entry.id}>
                            <a
                                aria-current={ENTRY_CURRENT[state]}
                                className={`flex h-8 items-center gap-2.5 rounded-md px-3 text-md ${ENTRY_CLASSES[state]}`}
                                data-focus-ring=""
                                href={`#/${group.root}/${entry.id}`}
                            >
                                <Icon name={entry.icon} size="md" />
                                <span className="truncate">{entry.label}</span>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
