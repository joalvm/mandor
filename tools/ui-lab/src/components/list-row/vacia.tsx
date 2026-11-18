import { EmptyRow } from '@mandor/ui';

/**
 * La sección vacía del lateral, dicha en una línea y a la profundidad de las filas que faltan.
 * Sin salida: la cabecera de la sección ya tiene el botón que la llena.
 */
export function VaciaDemo() {
    return (
        <div className="py-2">
            <div className="flex h-section items-center px-pad-panel text-sm text-text-secondary">
                Conexiones
            </div>
            <EmptyRow
                description="Crea una para empezar a escuchar"
                icon="connection"
                level={1}
                title="Sin conexiones"
            />
        </div>
    );
}
