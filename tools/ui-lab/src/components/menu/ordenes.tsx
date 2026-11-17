import { DuplicateIcon } from '@mandor/icons';
import { Menu, MenuButton, MenuContent, MenuItem, MenuSeparator, MenuShortcut } from '@mandor/ui';
import { useState } from 'react';

/** La última orden dicha, para ver que el menú la suelta al cerrarse, no antes. */
export function OrdenesDemo() {
    const [dicho, setDicho] = useState('—');

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Menu>
                <MenuButton icon="connection" label="gateway-local" variant="secondary" />
                <MenuContent>
                    <MenuItem
                        onSelect={() => {
                            setDicho('Renombrar');
                        }}
                    >
                        Renombrar
                        <MenuShortcut>F2</MenuShortcut>
                    </MenuItem>
                    <MenuItem
                        onSelect={() => {
                            setDicho('Duplicar');
                        }}
                    >
                        <span aria-hidden="true" className="flex shrink-0 items-center">
                            <DuplicateIcon />
                        </span>
                        Duplicar
                    </MenuItem>
                    <MenuItem
                        disabled
                        disabledReason="Sin conexión activa"
                        onSelect={() => {
                            setDicho('Exportar');
                        }}
                    >
                        Exportar
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                        onSelect={() => {
                            setDicho('Eliminar…');
                        }}
                    >
                        Eliminar…
                    </MenuItem>
                </MenuContent>
            </Menu>
            <p className="text-xs text-text-secondary">Última orden: {dicho}</p>
        </div>
    );
}
