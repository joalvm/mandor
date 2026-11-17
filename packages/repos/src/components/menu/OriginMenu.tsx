import { SettingsIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { useShellStore } from '@mandor/shell';
import { Menu, MenuButton, MenuContent, MenuItem, MenuSeparator } from '@mandor/ui';

import { originDisplayOf } from '../../lib/origin-display.js';
import { originLinkTone } from '../../lib/origin-link-tone.js';

type OriginMenuProps = {
    /** Administration is a tab, so the menu asks the app to open it instead of opening it. */
    onManage: () => void;
    /** Switching has an order only the app knows, so the menu asks the app to run it. */
    onSwitch: (id: string) => void;
};

/**
 * Names the origin the window works in and switches between the ones this machine knows. A
 * remote origin wears on its glyph whether it is reached; the local one wears nothing.
 */
export function OriginMenu({ onManage, onSwitch }: OriginMenuProps) {
    const messages = useMessages('origins');
    const origins = useShellStore((state) => state.origins);
    const activeOriginId = useShellStore((state) => state.activeOriginId);
    const syncState = useShellStore((state) => state.syncState);
    const active = origins.find((origin) => origin.id === activeOriginId);

    function switchTo(id: string): void {
        if (id === activeOriginId) {
            return;
        }

        onSwitch(id);
    }

    if (active === undefined) {
        return null;
    }

    const display = originDisplayOf(active);

    return (
        <Menu checkable>
            <MenuButton
                host={display.host}
                icon={display.name}
                label={active.name}
                tone={originLinkTone(active, syncState)}
                variant="ghost"
            />
            <MenuContent>
                {origins.map((origin) => {
                    const originDisplay = originDisplayOf(origin);
                    const Glyph = originDisplay.component;

                    return (
                        <MenuItem
                            checked={origin.id === activeOriginId}
                            key={origin.id}
                            onSelect={() => {
                                switchTo(origin.id);
                            }}
                        >
                            <span
                                aria-hidden="true"
                                className="flex shrink-0 items-center"
                                data-host={originDisplay.host}
                            >
                                <Glyph />
                            </span>
                            {origin.name}
                        </MenuItem>
                    );
                })}
                <MenuSeparator />
                <MenuItem onSelect={onManage}>
                    <SettingsIcon />
                    {messages('manage')}
                </MenuItem>
            </MenuContent>
        </Menu>
    );
}
