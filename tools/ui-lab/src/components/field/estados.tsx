import { Field, Input } from '@mandor/ui';
import { useState } from 'react';

/** Los cuatro estados; el error lo declara Field y el control de dentro lo lee por cableado. */
export function EstadosDemo() {
    const [ip, setIp] = useState('10.0.0.5');
    const [puerto, setPuerto] = useState('8080');
    const [nombre, setNombre] = useState('Torre norte');
    const [fqdn, setFqdn] = useState('gateway.prod');

    return (
        <div className="grid grid-cols-2 gap-gap-group">
            <Field id="campo-servidor" label="Servidor">
                <Input label="Servidor" onValueChange={setIp} value={ip} />
            </Field>
            <Field help="Entre 1 y 65535." id="campo-puerto" label="Puerto">
                <Input label="Puerto" onValueChange={setPuerto} unit="tcp" value={puerto} />
            </Field>
            <Field error="El nombre ya está en uso." id="campo-nombre" label="Nombre">
                <Input label="Nombre" onValueChange={setNombre} value={nombre} />
            </Field>
            <Field help="Lo fija el perfil del origen." id="campo-direccion" label="Dirección">
                <Input
                    disabled
                    disabledReason="Lo fija el perfil del origen"
                    label="Dirección"
                    onValueChange={setFqdn}
                    value={fqdn}
                />
            </Field>
        </div>
    );
}
