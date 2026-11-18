import { FolderIcon } from '@mandor/icons';
import { IconButton, InlineNameInput } from '@mandor/ui';
import { useState } from 'react';

const INICIALES = ['Gateway local', 'Pagos', 'Cuentas'];

function esValido(nombre: string): boolean {
    return nombre.trim().length > 0;
}

/**
 * La situación de siempre: una lista donde una fila entra en edición. La fila no crece ni se
 * redibuja — el glifo sigue en el suyo, el nombre se vuelve texto vivo en el hueco que tenía.
 */
export function ListaDemo() {
    const [nombres, setNombres] = useState(INICIALES);
    const [editando, setEditando] = useState<number | null>(null);

    function renombra(indice: number, borrador: string): boolean {
        const valido = esValido(borrador);

        if (valido) {
            setNombres(
                nombres.map((nombre, lugar) => (lugar === indice ? borrador.trim() : nombre)),
            );
            setEditando(null);
        }

        return valido;
    }

    return (
        <div className="flex w-72 flex-col text-sm text-text-primary">
            {nombres.map((nombre, indice) => (
                <div
                    className="group flex h-row-xs items-center gap-gap-control rounded-md px-2 hover:bg-surface-control-hover"
                    key={indice}
                >
                    <FolderIcon className="shrink-0 text-text-secondary" size="sm" />
                    {editando === indice ? (
                        <InlineNameInput
                            label="Nombre del workspace"
                            value={nombre}
                            onCancel={() => {
                                setEditando(null);
                            }}
                            onCommit={(borrador) => {
                                return renombra(indice, borrador);
                            }}
                        />
                    ) : (
                        <span className="min-w-0 flex-1 truncate">{nombre}</span>
                    )}
                    {editando === indice ? null : (
                        <IconButton
                            className="opacity-0 group-hover:opacity-100"
                            icon="rename"
                            label={`Renombrar ${nombre}`}
                            size="xs"
                            onClick={() => {
                                setEditando(indice);
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
