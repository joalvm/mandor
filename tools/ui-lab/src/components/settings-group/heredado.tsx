import { SettingRow, SettingsGroup, Switch } from '@mandor/ui';
import { useState } from 'react';

/**
 * Un ajuste que sigue al de la app hasta que guarda el suyo: la línea de debajo nombra de dónde
 * sale el valor y, cuando la fila ya tiene uno propio, lo devuelve. Fuera de Ajustes, sin líneas.
 */
export function HeredadoDemo() {
    const [own, setOwn] = useState<boolean | null>(null);

    return (
        <SettingsGroup title="Esta petición">
            <SettingRow
                help="Sigue la redirección que devuelve el servidor."
                inherits={{
                    caption: 'Por defecto:',
                    onFollow: () => {
                        setOwn(null);
                    },
                    place: 'Ajustes',
                    reset:
                        own === null
                            ? undefined
                            : {
                                  label: 'Usar el de Ajustes',
                                  onReset: () => {
                                      setOwn(null);
                                  },
                              },
                }}
                label="Seguir redirecciones"
            >
                <Switch
                    checked={own ?? true}
                    label="Seguir redirecciones"
                    onCheckedChange={setOwn}
                />
            </SettingRow>
        </SettingsGroup>
    );
}
