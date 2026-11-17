import { Field, Input } from '@mandor/ui';
import { useState } from 'react';

/** Placeholder, unidad dentro de la caja y el apagado con motivo; apunta al apagado. */
export function EstadosDemo() {
    const [vacio, setVacio] = useState('');
    const [tiempo, setTiempo] = useState('400');

    return (
        <div className="grid grid-cols-3 gap-gap-group">
            <Field id="input-placeholder" label="Servidor">
                <Input
                    label="Servidor"
                    onValueChange={setVacio}
                    placeholder="wss://host:puerto"
                    value={vacio}
                />
            </Field>
            <Field help="Cuánto espera una respuesta." id="input-unidad" label="Tiempo de espera">
                <Input
                    label="Tiempo de espera"
                    onValueChange={setTiempo}
                    unit="ms"
                    value={tiempo}
                />
            </Field>
            <Field help="Lo fija el perfil." id="input-apagado" label="Reintentos">
                <Input
                    disabled
                    disabledReason="El perfil del origen decide los reintentos"
                    label="Reintentos"
                    onValueChange={() => undefined}
                    value="3"
                />
            </Field>
        </div>
    );
}
