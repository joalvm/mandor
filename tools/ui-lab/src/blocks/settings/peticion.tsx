import {
    defaultsEditing,
    overridesEditing,
    type SettingOverrides,
    type SettingsEditing,
} from '@mandor/ui';
import { useState, type ReactNode } from 'react';

import { PALABRAS, PETICION_DE_FABRICA, type AjustesPeticion } from './ajustes.js';
import { EnvioSection } from './peticion-envio.js';
import { RedireccionesSection } from './peticion-redirecciones.js';
import { TlsSection } from './peticion-tls.js';

/** Las mismas filas para los dos dueños: solo cambia el `editing` que reciben. */
function PeticionFilas({ editing }: { editing: SettingsEditing<AjustesPeticion> }): ReactNode {
    return (
        <div className="flex min-w-0 flex-col gap-gap-section">
            <EnvioSection editing={editing} />
            <RedireccionesSection editing={editing} />
            <TlsSection editing={editing} />
        </div>
    );
}

/**
 * Los valores por defecto viven en los ajustes de la app; la petición guarda solo lo que cambia.
 * Cambiar un valor arriba llega abajo a cada fila que la petición dejó en paz.
 */
export function PeticionDemo(): ReactNode {
    const [generales, setGenerales] = useState(PETICION_DE_FABRICA);
    // Lo que el archivo de la petición guarda: así nace, con el certificado apagado.
    const [propios, setPropios] = useState<SettingOverrides<AjustesPeticion>>({
        validateTls: false,
    });

    return (
        <div className="flex max-w-2xl flex-col gap-gap-section">
            <p className="px-pad-control text-xs text-text-secondary">
                Ajustes de la app · Peticiones
            </p>
            <PeticionFilas editing={defaultsEditing(generales, setGenerales)} />
            <p className="px-pad-control text-xs text-text-secondary">
                Una petición · guarda {JSON.stringify(propios)}
            </p>
            <PeticionFilas
                editing={overridesEditing({
                    defaults: generales,
                    onOverrides: setPropios,
                    overrides: propios,
                    words: PALABRAS,
                })}
            />
        </div>
    );
}
