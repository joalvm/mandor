import { overridesEditing, SettingsGroup, type SettingOverrides } from '@mandor/ui';
import { useState, type ReactNode } from 'react';

import { PALABRAS, type Latido, type Reintento } from './ajustes.js';
import { LatidoFilas, ReintentoFilas } from './conexion-filas.js';

/** Los valores por defecto de las conexiones, como los deja la fábrica. */
const REINTENTO: Reintento = {
    attempts: 5,
    enabled: true,
    initialWaitMs: 500,
    maximumWaitMs: 8000,
    spread: 0.2,
};

const LATIDO: Latido = { enabled: false, intervalMs: 30000, pongTimeoutMs: 10000 };

/**
 * Las mismas piezas en Mandor Realtime: cómo vuelve una conexión y cómo prueba que sigue viva,
 * sobre los valores por defecto de la app. La conexión guarda solo lo que decide.
 */
export function ConexionDemo(): ReactNode {
    const [reintento, setReintento] = useState<SettingOverrides<Reintento>>({ attempts: 10 });
    const [latido, setLatido] = useState<SettingOverrides<Latido>>({});

    return (
        <div className="flex max-w-2xl flex-col gap-gap-section">
            <SettingsGroup title="Reintento">
                <ReintentoFilas
                    editing={overridesEditing({
                        defaults: REINTENTO,
                        onOverrides: setReintento,
                        overrides: reintento,
                        words: PALABRAS,
                    })}
                />
            </SettingsGroup>
            <SettingsGroup title="Keepalive">
                <LatidoFilas
                    editing={overridesEditing({
                        defaults: LATIDO,
                        onOverrides: setLatido,
                        overrides: latido,
                        words: PALABRAS,
                    })}
                />
            </SettingsGroup>
        </div>
    );
}
