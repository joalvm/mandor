import { Field, Input } from '@mandor/ui';
import { useState } from 'react';

/**
 * Ayuda y error comparten la línea de debajo: cuando llega el error, la ayuda cede su sitio y el
 * campo no crece. El error repite la regla que la ayuda explicaba, para que no se pierda nada.
 */
export function ErrorAyudaDemo() {
    const [bueno, setBueno] = useState('8080');
    const [malo, setMalo] = useState('70000');

    return (
        <div className="grid grid-cols-2 gap-gap-group">
            <Field help="Entre 1 y 65535." id="puerto-valido" label="Puerto">
                <Input label="Puerto" onValueChange={setBueno} value={bueno} />
            </Field>
            <Field
                error="Debe estar entre 1 y 65535."
                help="Entre 1 y 65535."
                id="puerto-invalido"
                label="Puerto"
            >
                <Input label="Puerto" onValueChange={setMalo} value={malo} />
            </Field>
        </div>
    );
}
