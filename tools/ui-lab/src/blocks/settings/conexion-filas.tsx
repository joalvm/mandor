import {
    NumberInput,
    SettingDependents,
    SettingRow,
    Switch,
    type SettingsEditing,
} from '@mandor/ui';
import type { ReactNode } from 'react';

import type { Latido, Reintento } from './ajustes.js';

/** Si la conexión vuelve sola, y la política con que vuelve: cuelga del interruptor. */
export function ReintentoFilas({ editing }: { editing: SettingsEditing<Reintento> }): ReactNode {
    const { change, inheritanceOf, values } = editing;

    return (
        <>
            <SettingRow
                help="No afecta a un primer intento fallido ni a una desconexión manual."
                inherits={inheritanceOf('enabled')}
                label="Reconectar cuando el servidor cuelga"
            >
                <Switch
                    checked={values.enabled}
                    label="Reconectar cuando el servidor cuelga"
                    onCheckedChange={(enabled) => {
                        change({ enabled });
                    }}
                />
            </SettingRow>
            {values.enabled ? (
                <SettingDependents>
                    <SettingRow inherits={inheritanceOf('attempts')} label="Intentos">
                        <NumberInput
                            label="Intentos"
                            min={1}
                            onNumber={(attempts) => {
                                change({ attempts });
                            }}
                            value={values.attempts}
                        />
                    </SettingRow>
                    <SettingRow
                        help="Se duplica en cada intento hasta llegar a la espera máxima."
                        inherits={inheritanceOf('initialWaitMs')}
                        label="Espera inicial"
                    >
                        <NumberInput
                            label="Espera inicial"
                            min={1}
                            onNumber={(initialWaitMs) => {
                                change({ initialWaitMs });
                            }}
                            unit="ms"
                            value={values.initialWaitMs}
                        />
                    </SettingRow>
                    <SettingRow inherits={inheritanceOf('maximumWaitMs')} label="Espera máxima">
                        <NumberInput
                            label="Espera máxima"
                            min={1}
                            onNumber={(maximumWaitMs) => {
                                change({ maximumWaitMs });
                            }}
                            unit="ms"
                            value={values.maximumWaitMs}
                        />
                    </SettingRow>
                    <SettingRow
                        help="Varía cada espera al azar en este porcentaje."
                        inherits={inheritanceOf('spread')}
                        label="Dispersión"
                    >
                        <NumberInput
                            label="Dispersión"
                            onNumber={(percent) => {
                                change({ spread: Math.min(percent, 100) / 100 });
                            }}
                            unit="%"
                            value={Math.round(values.spread * 100)}
                        />
                    </SettingRow>
                </SettingDependents>
            ) : null}
        </>
    );
}

/** Un ping cada intervalo y un pong que tiene que llegar a tiempo. Los dos cuelgan del interruptor. */
export function LatidoFilas({ editing }: { editing: SettingsEditing<Latido> }): ReactNode {
    const { change, inheritanceOf, values } = editing;

    return (
        <>
            <SettingRow
                help="Si el pong no llega dentro del plazo, la conexión se toma por caída."
                inherits={inheritanceOf('enabled')}
                label="Enviar un ping periódico"
            >
                <Switch
                    checked={values.enabled}
                    label="Enviar un ping periódico"
                    onCheckedChange={(enabled) => {
                        change({ enabled });
                    }}
                />
            </SettingRow>
            {values.enabled ? (
                <SettingDependents>
                    <SettingRow inherits={inheritanceOf('intervalMs')} label="Intervalo">
                        <NumberInput
                            label="Intervalo"
                            min={1}
                            onNumber={(intervalMs) => {
                                change({ intervalMs });
                            }}
                            unit="ms"
                            value={values.intervalMs}
                        />
                    </SettingRow>
                    <SettingRow inherits={inheritanceOf('pongTimeoutMs')} label="Plazo del pong">
                        <NumberInput
                            label="Plazo del pong"
                            min={1}
                            onNumber={(pongTimeoutMs) => {
                                change({ pongTimeoutMs });
                            }}
                            unit="ms"
                            value={values.pongTimeoutMs}
                        />
                    </SettingRow>
                </SettingDependents>
            ) : null}
        </>
    );
}
