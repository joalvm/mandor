import { InlineNameInput } from '@mandor/ui';
import { useState } from 'react';

const INICIALES = ['Métricas', 'Cobros', 'Ajustes'];

function esValido(nombre: string): boolean {
    return nombre.trim().length > 0;
}

/**
 * La otra situación: la pestaña cuyo nombre cambia en el sitio. La tira no se mueve — la
 * pestaña activa sigue siendo la misma mientras su texto se edita dentro de ella.
 */
export function PestanasDemo() {
    const [nombres, setNombres] = useState(INICIALES);
    const [activa, setActiva] = useState(0);
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
        <div className="flex w-96 items-end border-b border-border-subtle" role="tablist">
            {nombres.map((nombre, indice) => (
                <div
                    aria-selected={activa === indice}
                    className="flex h-tab cursor-pointer items-center px-pad-control text-sm"
                    data-part="tabs-trigger"
                    data-state={activa === indice ? 'active' : undefined}
                    key={indice}
                    role="tab"
                    onClick={() => {
                        if (editando !== indice) {
                            setActiva(indice);
                        }
                    }}
                    onDoubleClick={() => {
                        setEditando(indice);
                    }}
                >
                    {editando === indice ? (
                        <InlineNameInput
                            label="Nombre de la pestaña"
                            value={nombre}
                            onCancel={() => {
                                setEditando(null);
                            }}
                            onCommit={(borrador) => {
                                return renombra(indice, borrador);
                            }}
                        />
                    ) : (
                        <span className="min-w-0 truncate">{nombre}</span>
                    )}
                </div>
            ))}
        </div>
    );
}
