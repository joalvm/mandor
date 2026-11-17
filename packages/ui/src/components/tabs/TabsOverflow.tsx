import { IconButton } from '../button/IconButton.js';
import { Menu } from '../menu/Menu.js';
import { MenuContent } from '../menu/MenuContent.js';
import { MenuItem } from '../menu/MenuItem.js';
import { MenuTrigger } from '../menu/MenuTrigger.js';

type TabsOverflowProps = {
    /** The sections the list leaves out of view, as it drew them. */
    hidden: readonly HTMLElement[];
    label: string;
    /** Opens the section chosen, by its value. */
    onChoose: (value: string) => void;
};

/**
 * The menu at the end of a strip too narrow for its sections: one line per section left out of
 * view, with its count and its dot of unsent work, read off the section as it stands when the
 * menu opens. Choosing one opens it, and the strip scrolls to keep the open section in view; the
 * focus goes back to the menu, which still holds the rest.
 *
 * It is named like the list, because it is the rest of it.
 */
export function TabsOverflow({ hidden, label, onChoose }: TabsOverflowProps) {
    if (hidden.length === 0) {
        return null;
    }

    return (
        <Menu>
            <MenuTrigger>
                <IconButton icon="chevron-down" iconSize="sm" label={label} size="xs" />
            </MenuTrigger>
            <MenuContent>
                {hidden.map((section) => (
                    <MenuItem
                        key={section.dataset['value']}
                        onSelect={() => {
                            onChoose(section.dataset['value'] ?? '');
                        }}
                    >
                        <span className="min-w-0 flex-1 truncate">{section.dataset['label']}</span>
                        <OverflowCount count={section.dataset['count']} />
                        <OverflowDirty dirty={section.dataset['dirty']} />
                    </MenuItem>
                ))}
            </MenuContent>
        </Menu>
    );
}

function OverflowCount({ count }: { count: string | undefined }) {
    if (count === undefined) {
        return null;
    }

    return <span className="text-xs tabular-nums text-text-secondary">{count}</span>;
}

function OverflowDirty({ dirty }: { dirty: string | undefined }) {
    if (dirty === undefined) {
        return null;
    }

    return <span className="size-1.5 rounded-full bg-text-accent" data-part="tabs-dirty" />;
}
