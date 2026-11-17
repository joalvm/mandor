import { Field, Input } from '@mandor/ui';
import { useState } from 'react';

/** Dos cajas: la hundida de siempre y la plana, para cuando la línea vive dentro de otra caja. */
export function VariantesDemo() {
    const [caja, setCaja] = useState('gateway.prod');
    const [plana, setPlana] = useState('gateway.prod');

    return (
        <div className="grid grid-cols-2 gap-gap-group">
            <Field id="variante-caja" label="Con caja">
                <Input label="Con caja" onValueChange={setCaja} value={caja} />
            </Field>
            <Field id="variante-plana" label="Plana">
                <Input label="Plana" onValueChange={setPlana} value={plana} variant="flat" />
            </Field>
        </div>
    );
}
