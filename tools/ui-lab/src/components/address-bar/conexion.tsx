import { AddressField, EnvironmentSelect } from '@mandor/env';
import { AddressBar } from '@mandor/ui';
import { useState } from 'react';

import { ENTORNO, STAGING } from './entorno.js';

/**
 * La barra de una conexión: el entorno contra el que resuelve, el namespace cuando no es la raíz,
 * y la dirección. El transporte no va aquí: una conexión se hace para uno y se fija en sus
 * ajustes. El selector solo elige; administrar entornos vive en la barra de título.
 */
export function ConexionDemo() {
    const [url, setUrl] = useState('{{base_url}}socket');
    const [entorno, setEntorno] = useState<string>(ENTORNO.id);
    const elegido = [ENTORNO, STAGING].find((each) => each.id === entorno);

    return (
        <div className="flex h-header w-full items-center bg-surface-panel px-pad-panel">
            <AddressBar className="flex-1">
                <EnvironmentSelect
                    onChange={setEntorno}
                    options={[ENTORNO, STAGING]}
                    value={entorno}
                />
                <span className="shrink-0 px-pad-control font-ui text-sm text-text-secondary">
                    /chat
                </span>
                <AddressField
                    environment={elegido}
                    label="URL de la conexión"
                    onChange={setUrl}
                    onVariablesChange={() => undefined}
                    value={url}
                />
            </AddressBar>
        </div>
    );
}
