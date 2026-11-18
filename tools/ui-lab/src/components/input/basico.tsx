import { Field, Input } from '@mandor/ui';
import { useState } from 'react';

/** El campo canónico: etiqueta, caja y línea. Escribe: es un control de verdad. */
export function BasicoDemo() {
    const [url, setUrl] = useState('wss://gateway.prod:443');

    return (
        <Field help="La dirección del servidor." id="input-basico" label="URL">
            <Input label="URL" onValueChange={setUrl} value={url} />
        </Field>
    );
}
