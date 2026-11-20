import { AddressField } from '@mandor/env';
import { SendIcon } from '@mandor/icons';
import { AddressBar, AddressEnd, Button, IconButton, MethodPicker } from '@mandor/ui';
import { useState } from 'react';

import { ENTORNO } from './entorno.js';

const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

/**
 * La barra de una petición: el verbo y la dirección son un solo control, con «ver como código»
 * dentro de su borde, y enviar queda fuera.
 * La dirección va en la fuente de la interfaz, con las variables como pastillas dentro de la
 * misma línea.
 */
export function PeticionDemo() {
    const [metodo, setMetodo] = useState('POST');
    const [url, setUrl] = useState('{{base_url}}session');

    return (
        <div className="flex h-header w-full items-center gap-gap-control px-pad-panel">
            <AddressBar className="flex-1">
                <MethodPicker
                    accepts={(verbo) => /^[A-Z][A-Z0-9-]*$/.test(verbo)}
                    label="Método"
                    methods={METODOS}
                    onValueChange={setMetodo}
                    otherField="Método propio"
                    otherLabel="Otro método…"
                    value={metodo}
                />
                <AddressField
                    environment={ENTORNO}
                    label="URL"
                    onChange={setUrl}
                    onVariablesChange={() => undefined}
                    value={url}
                />
                <AddressEnd>
                    <IconButton icon="code" label="Código" />
                </AddressEnd>
            </AddressBar>
            <Button variant="primary">
                <SendIcon size="sm" />
                Enviar
            </Button>
        </div>
    );
}
