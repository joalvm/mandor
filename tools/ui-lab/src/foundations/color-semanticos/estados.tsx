import { useState } from 'react';

import { Badge, Button, Input, StatusDot } from '@mandor/ui';

/**
 * Los estados con piezas de Sync: la respuesta de un request y la vida de una conexión. La
 * señal lleva texto o número al lado del color, y el rojo de intención solo lo lleva el verbo
 * destructivo.
 */
export function EstadosDemo() {
    const [value, setValue] = useState('api.ejemplo.dev');

    return (
        <div className="flex flex-col gap-gap-group">
            <div className="flex flex-wrap items-center gap-gap-control">
                <Badge tone="success">200</Badge>
                <Badge tone="info">301</Badge>
                <Badge tone="warning">429</Badge>
                <Badge tone="error">500</Badge>
                <Badge tone="accent">nueva</Badge>
                <Badge>borrador</Badge>
            </div>
            <div className="flex items-center gap-gap-group">
                <StatusDot label="Conectado" state="connected" />
                <StatusDot label="Conectando" state="connecting" />
                <StatusDot label="Desconectado" state="disconnected" />
                <StatusDot label="Error" state="error" />
                <span className="text-xs text-text-secondary">
                    los cuatro estados de una conexión viva
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-gap-control">
                <Button variant="primary">Conectar</Button>
                <Button variant="secondary">Guardar</Button>
                <Button variant="danger">Eliminar</Button>
                <Button variant="ghost">Descartar</Button>
            </div>
            <div className="max-w-xs">
                <Input invalid label="Servidor" value={value} onValueChange={setValue} />
            </div>
        </div>
    );
}
