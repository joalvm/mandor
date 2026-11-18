import { IconButton, Tooltip } from '@mandor/ui';

/**
 * El tooltip repite la misma cadena que el label del botón — dos cadenas para un nombre son
 * dos verdades— y completa lo truncado: la celda corta, el tooltip entero.
 */
export function BasicoDemo() {
    return (
        <div className="flex items-center gap-gap-section">
            <Tooltip content="Grabar">
                <IconButton icon="record" label="Grabar" />
            </Tooltip>
            <Tooltip content="gateway-local-produccion.sock">
                <span className="max-w-30 truncate text-sm text-text-primary">
                    gateway-local-produccion.sock
                </span>
            </Tooltip>
        </div>
    );
}
