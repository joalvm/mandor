import { ListRow, Panel, RowLabel } from '@mandor/ui';
import { useState } from 'react';

const CONEXIONES = [
    'gateway-local',
    'gateway-staging',
    'gateway-produccion',
    'cola-muerta',
    'socket-io-dev',
    'webhook-eco',
    'sse-tablero',
    'grpc-inventario',
    'mqtt-planta',
    'websocket-tiempo-real',
];

/**
 * La región con nombre: la cabecera se queda y el cuerpo hace scroll debajo.
 * La cabecera lleva el nombre y nada más — lo que actúa sobre la región vive en el cuerpo.
 */
export function RegionDemo() {
    const [tomada, setTomada] = useState('gateway-local');

    return (
        <div className="flex h-44 flex-col">
            <Panel title="Conexiones">
                <div aria-label="Conexiones" className="flex flex-col py-1" role="listbox">
                    {CONEXIONES.map((conexion) => (
                        <ListRow
                            key={conexion}
                            onSelect={() => {
                                setTomada(conexion);
                            }}
                            selected={conexion === tomada}
                        >
                            <RowLabel>{conexion}</RowLabel>
                        </ListRow>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
