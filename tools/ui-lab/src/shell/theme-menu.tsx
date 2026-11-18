import { IconButton, Menu, MenuContent, MenuItem, MenuTrigger } from '@mandor/ui';

import { storeTheme, type ThemeChoice } from '../theme.js';

const THEME_OPTIONS: readonly { choice: ThemeChoice; label: string }[] = [
    { choice: 'system', label: 'Sistema' },
    { choice: 'light', label: 'Claro' },
    { choice: 'dark', label: 'Oscuro' },
];

type ThemeMenuProps = {
    onPick: (pick: ThemeChoice) => void;
    theme: ThemeChoice;
};

/** The appearance preference of the platform, written with the same mechanism as the apps. */
export function ThemeMenu({ onPick, theme }: ThemeMenuProps) {
    return (
        <Menu checkable>
            <MenuTrigger>
                <IconButton icon="color-mode" label="Tema" />
            </MenuTrigger>
            <MenuContent>
                {THEME_OPTIONS.map((option) => (
                    <MenuItem
                        checked={theme === option.choice}
                        key={option.choice}
                        onSelect={() => {
                            storeTheme(option.choice);
                            onPick(option.choice);
                        }}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </MenuContent>
        </Menu>
    );
}
