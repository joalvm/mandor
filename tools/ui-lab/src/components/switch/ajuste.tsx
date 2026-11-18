import { Field, Switch } from '@mandor/ui';
import { useState } from 'react';

/** En una fila de ajustes: el Field pone la etiqueta y la ayuda; el switch va suelto a la derecha. */
export function AjusteDemo() {
    const [reintentar, setReintentar] = useState(true);
    const [comprimir, setComprimir] = useState(false);

    return (
        <div className="grid grid-cols-2 gap-gap-group">
            <Field
                help="Hasta tres veces, con espera creciente."
                id="reintentar"
                label="Reintentar"
            >
                <div className="flex items-center justify-between">
                    <Switch
                        checked={reintentar}
                        label="Reintentar"
                        onCheckedChange={setReintentar}
                    />
                    <span className="font-mono text-xs text-text-secondary">
                        {reintentar ? 'on' : 'off'}
                    </span>
                </div>
            </Field>
            <Field help="Reduce el cuerpo a costo de CPU." id="comprimir" label="Comprimir tramas">
                <div className="flex items-center justify-between">
                    <Switch
                        checked={comprimir}
                        label="Comprimir tramas"
                        onCheckedChange={setComprimir}
                    />
                    <span className="font-mono text-xs text-text-secondary">
                        {comprimir ? 'on' : 'off'}
                    </span>
                </div>
            </Field>
        </div>
    );
}
