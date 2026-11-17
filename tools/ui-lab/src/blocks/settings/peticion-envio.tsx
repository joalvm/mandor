import {
    NumberInput,
    Select,
    SettingRow,
    SettingsGroup,
    Switch,
    type SettingsEditing,
} from '@mandor/ui';
import type { ReactNode } from 'react';

import type { AjustesPeticion } from './ajustes.js';

const VERSIONES = [
    { label: 'Automática', value: 'auto' },
    { label: 'HTTP/1.1', value: 'http1' },
    { label: 'HTTP/2', value: 'http2' },
];

type EnvioSectionProps = {
    editing: SettingsEditing<AjustesPeticion>;
};

/** Cuánto espera un envío, qué HTTP habla y si viaja el tarro de cookies del entorno. */
export function EnvioSection({ editing }: EnvioSectionProps): ReactNode {
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingsGroup title="Envío">
            <SettingRow
                help="Cuánto espera el envío la respuesta entera antes de rendirse."
                inherits={inheritanceOf('timeoutMs')}
                label="Tiempo de espera"
            >
                <NumberInput
                    label="Tiempo de espera"
                    min={1}
                    onNumber={(timeoutMs) => {
                        change({ timeoutMs });
                    }}
                    unit="ms"
                    value={values.timeoutMs}
                />
            </SettingRow>
            <SettingRow
                help="Automática deja que el servidor elija HTTP/2 o HTTP/1.1 al abrir la conexión."
                inherits={inheritanceOf('httpVersion')}
                label="Versión de HTTP"
            >
                <Select
                    label="Versión de HTTP"
                    onValueChange={(httpVersion) => {
                        change({ httpVersion });
                    }}
                    options={VERSIONES}
                    value={values.httpVersion}
                />
            </SettingRow>
            <SettingRow
                help="Salen las cookies del tarro para la dirección, y se guardan las que fija la respuesta."
                inherits={inheritanceOf('useCookieJar')}
                label="Usar el tarro de cookies"
            >
                <Switch
                    checked={values.useCookieJar}
                    label="Usar el tarro de cookies"
                    onCheckedChange={(useCookieJar) => {
                        change({ useCookieJar });
                    }}
                />
            </SettingRow>
        </SettingsGroup>
    );
}
