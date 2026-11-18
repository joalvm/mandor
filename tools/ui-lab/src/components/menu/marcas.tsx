import { EnvironmentIcon } from '@mandor/icons';
import { Menu, MenuButton, MenuContent, MenuItem } from '@mandor/ui';
import { useState } from 'react';

const ENTORNOS = [
    { id: 'local', label: 'Local' },
    { id: 'staging', label: 'Staging' },
    { id: 'produccion', label: 'Producción' },
] as const;

/**
 * El menú que lleva marcas: la línea elegida va en peso, nada más. El hueco de la izquierda
 * existe solo en las líneas que llevan glifo, y las que no quedan flush.
 */
export function MarcasDemo() {
    const [elegido, setElegido] = useState('local');

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Menu checkable>
                <MenuButton icon="environment" label="Local" variant="ghost" />
                <MenuContent>
                    {ENTORNOS.map((entorno) => (
                        <MenuItem
                            checked={entorno.id === elegido}
                            key={entorno.id}
                            onSelect={() => {
                                setElegido(entorno.id);
                            }}
                        >
                            <span aria-hidden="true" className="flex shrink-0 items-center">
                                <EnvironmentIcon />
                            </span>
                            {entorno.label}
                        </MenuItem>
                    ))}
                </MenuContent>
            </Menu>
            <p className="text-xs text-text-secondary">
                Entorno activo: {ENTORNOS.find((entorno) => entorno.id === elegido)?.label}
            </p>
        </div>
    );
}
