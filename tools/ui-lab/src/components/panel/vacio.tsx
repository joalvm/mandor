import { Button, EmptyState, Panel } from '@mandor/ui';

/**
 * La región vacía, explicada: qué falta, por qué y la salida escrita debajo.
 * El glifo no es opcional — es lo que separa un vacío real de una región que falló al cargar.
 */
export function VacioDemo() {
    return (
        <div className="flex h-64 flex-col">
            <Panel title="Actividad">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <EmptyState
                        description="Abre una conexión para empezar a escuchar eventos."
                        icon="connection"
                        title="Sin actividad"
                    >
                        <Button variant="primary">Conectar</Button>
                    </EmptyState>
                </div>
            </Panel>
        </div>
    );
}
