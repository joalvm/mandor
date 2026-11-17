import { ConnectionIcon } from '@mandor/icons';
import { Badge, ListRow, RowLabel, StatusDot } from '@mandor/ui';
import { useState } from 'react';

const ENTRADAS = [
    { nombre: 'gateway-local', señal: 'badge' as const },
    { nombre: 'gateway-staging', señal: undefined },
    { nivel: 1, nombre: 'cola-muerta', señal: 'punto' as const },
    { nivel: 1, nombre: 'socket-io-dev', señal: undefined },
    { nombre: 'webhook-eco', señal: 'atajo' as const },
];

/**
 * La fila densa que se toma con el ratón o con Enter, y dice si es la tomada.
 * Con nivel reserva el hueco del chevron, para que sus glifos caigan en la columna del árbol.
 */
export function ListaDemo() {
    const [tomada, setTomada] = useState('gateway-local');

    return (
        <div aria-label="Conexiones" className="flex flex-col py-1" role="listbox">
            {ENTRADAS.map((entrada) => (
                <ListRow
                    key={entrada.nombre}
                    level={'nivel' in entrada ? entrada.nivel : undefined}
                    onSelect={() => {
                        setTomada(entrada.nombre);
                    }}
                    selected={entrada.nombre === tomada}
                >
                    <ConnectionIcon size="sm" />
                    <RowLabel>{entrada.nombre}</RowLabel>
                    {entrada.señal === 'badge' ? <Badge tone="success">viva</Badge> : null}
                    {entrada.señal === 'punto' ? (
                        <StatusDot label="Reconectando" state="connecting" />
                    ) : null}
                    {entrada.señal === 'atajo' ? (
                        <span className="text-2xs text-text-secondary tabular-nums">F2</span>
                    ) : null}
                </ListRow>
            ))}
        </div>
    );
}
