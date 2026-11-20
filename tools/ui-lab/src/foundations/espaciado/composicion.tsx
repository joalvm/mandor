import { useState } from 'react';

import { Button, Field, Input, Switch } from '@mandor/ui';

/** Una composición real: panel con su pad, secciones separadas por gap de grupo, controles por gap de control. */
export function ComposicionDemo() {
    const [host, setHost] = useState('localhost');
    const [keepalive, setKeepalive] = useState(true);

    return (
        <div className="w-72 rounded-md border border-border-subtle bg-surface-card p-pad-panel">
            <div className="flex h-section items-center">
                <h4 className="text-sm font-semibold text-text-primary">Conexión</h4>
            </div>
            <div className="flex flex-col gap-gap-group">
                <Field id="host" label="Servidor" help="El nombre o la dirección del equipo.">
                    <Input label="Servidor" value={host} onValueChange={setHost} />
                </Field>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">Keepalive</span>
                    <Switch checked={keepalive} label="Keepalive" onCheckedChange={setKeepalive} />
                </div>
                <div className="flex justify-end gap-gap-control">
                    <Button variant="secondary">Cancelar</Button>
                    <Button variant="primary">Guardar</Button>
                </div>
            </div>
        </div>
    );
}
