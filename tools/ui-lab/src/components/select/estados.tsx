import { Field, Select } from '@mandor/ui';
import { useState } from 'react';

const TRANSPORTES = [
    { label: 'WebSocket', value: 'ws' },
    { label: 'Socket.IO', value: 'socket.io' },
    { label: 'Polling', value: 'polling' },
];

/** Con valor, con placeholder, con error y apagado con motivo: el gatillo mide lo mismo en los cuatro. */
export function EstadosDemo() {
    const [elegido, setElegido] = useState<string | undefined>('ws');

    return (
        <div className="grid grid-cols-4 gap-gap-group">
            <Field id="con-valor" label="Transporte">
                <Select
                    label="Transporte"
                    onValueChange={setElegido}
                    options={TRANSPORTES}
                    value={elegido}
                />
            </Field>
            <Field id="sin-valor" label="Sin elegir">
                <Select
                    label="Sin elegir"
                    onValueChange={() => undefined}
                    options={TRANSPORTES}
                    placeholder="Elige uno"
                />
            </Field>
            <Field error="Elige un transporte." id="con-error" label="Con error">
                <Select label="Con error" onValueChange={() => undefined} options={TRANSPORTES} />
            </Field>
            <Field id="apagado" label="Apagado">
                <Select
                    disabled
                    disabledReason="Hay una conexión abierta; ciérrala para cambiar el transporte."
                    label="Apagado"
                    onValueChange={() => undefined}
                    options={TRANSPORTES}
                    value="ws"
                />
            </Field>
        </div>
    );
}
