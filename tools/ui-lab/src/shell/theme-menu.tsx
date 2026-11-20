import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@mandor/ui';
import { Fragment } from 'react';

import { storeAppearance, type Appearance } from '../theme.js';

type AppearanceKey = keyof Appearance;

type AppearanceGroup<K extends AppearanceKey> = {
    key: K;
    options: readonly { choice: Appearance[K]; label: string }[];
};

/** Las tres preferencias de Ajustes › Temas de las apps, en el mismo orden. */
const GROUPS: readonly AppearanceGroup<AppearanceKey>[] = [
    {
        key: 'theme',
        options: [
            { choice: 'system', label: 'Tema del sistema' },
            { choice: 'light', label: 'Tema claro' },
            { choice: 'dark', label: 'Tema oscuro' },
        ],
    },
    {
        key: 'density',
        options: [
            { choice: 'comfortable', label: 'Densidad cómoda' },
            { choice: 'compact', label: 'Densidad compacta' },
        ],
    },
    {
        key: 'motion',
        options: [
            { choice: 'system', label: 'Animaciones del sistema' },
            { choice: 'full', label: 'Animaciones completas' },
            { choice: 'reduced', label: 'Animaciones reducidas' },
        ],
    },
];

/** The line between two groups: none above the first. */
function GroupSeparator({ first }: { first: boolean }) {
    if (first) {
        return null;
    }

    return <MenuSeparator />;
}

type ThemeMenuProps = {
    appearance: Appearance;
    onPick: (pick: Appearance) => void;
};

/** The appearance preferences of the platform, written with the same mechanism as the apps. */
export function ThemeMenu({ appearance, onPick }: ThemeMenuProps) {
    return (
        <Menu checkable>
            <MenuTrigger>
                <IconButton icon="color-mode" label="Apariencia" />
            </MenuTrigger>
            <MenuContent>
                {GROUPS.map((group, index) => (
                    <Fragment key={group.key}>
                        <GroupSeparator first={index === 0} />
                        {group.options.map((option) => (
                            <MenuItem
                                checked={appearance[group.key] === option.choice}
                                key={option.choice}
                                onSelect={() => {
                                    storeAppearance(group.key, option.choice);
                                    onPick({ ...appearance, [group.key]: option.choice });
                                }}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </Fragment>
                ))}
            </MenuContent>
        </Menu>
    );
}
