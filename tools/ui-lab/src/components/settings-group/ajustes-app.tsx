import { Input, SettingRow, SettingsGroup, Switch } from '@mandor/ui';
import { useState } from 'react';

/**
 * Los ajustes de la app, como una lista: sin caja alrededor, con una línea fina bajo el título y
 * entre filas. Las líneas las pone el marco de Ajustes (`data-part="app-settings"`), no el grupo.
 */
export function AjustesAppDemo() {
    const [wrap, setWrap] = useState(true);
    const [timeout, setTimeoutValue] = useState('30000');

    return (
        <div data-part="app-settings">
            <SettingsGroup title="Petición">
                <SettingRow
                    help="Corta las líneas largas del body al ancho del editor."
                    label="Ajustar líneas"
                >
                    <Switch checked={wrap} label="Ajustar líneas" onCheckedChange={setWrap} />
                </SettingRow>
                <SettingRow
                    help="Cuánto espera una petición antes de darse por perdida."
                    label="Tiempo de espera"
                >
                    <Input
                        label="Tiempo de espera"
                        onValueChange={setTimeoutValue}
                        unit="ms"
                        value={timeout}
                    />
                </SettingRow>
            </SettingsGroup>
        </div>
    );
}
