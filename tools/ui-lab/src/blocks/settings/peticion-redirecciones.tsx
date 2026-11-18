import {
    NumberInput,
    SettingDependents,
    SettingRow,
    SettingsGroup,
    Switch,
    type SettingsEditing,
} from '@mandor/ui';
import type { ReactNode } from 'react';

import type { AjustesPeticion } from './ajustes.js';

type RedireccionesSectionProps = {
    editing: SettingsEditing<AjustesPeticion>;
};

/** Si se sigue una redirección, y lo que solo vale mientras se sigue: cuelga del interruptor. */
export function RedireccionesSection({ editing }: RedireccionesSectionProps): ReactNode {
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingsGroup title="Redirecciones">
            <SettingRow
                help="Una respuesta 3xx se sigue hasta donde apunta."
                inherits={inheritanceOf('followRedirects')}
                label="Seguir redirecciones"
            >
                <Switch
                    checked={values.followRedirects}
                    label="Seguir redirecciones"
                    onCheckedChange={(followRedirects) => {
                        change({ followRedirects });
                    }}
                />
            </SettingRow>
            {values.followRedirects ? (
                <SettingDependents>
                    <SettingRow
                        help="Pasado el tope, el envío falla. Cero no sigue ninguna."
                        inherits={inheritanceOf('maxRedirects')}
                        label="Tope de redirecciones"
                    >
                        <NumberInput
                            label="Tope de redirecciones"
                            onNumber={(maxRedirects) => {
                                change({ maxRedirects });
                            }}
                            value={values.maxRedirects}
                        />
                    </SettingRow>
                    <SettingRow
                        help="Un 301 o 302 repite el método y el cuerpo en vez de convertir un POST en GET. Un 303 siempre es GET."
                        inherits={inheritanceOf('keepMethodOnRedirect')}
                        label="Conservar el método al redirigir"
                    >
                        <Switch
                            checked={values.keepMethodOnRedirect}
                            label="Conservar el método al redirigir"
                            onCheckedChange={(keepMethodOnRedirect) => {
                                change({ keepMethodOnRedirect });
                            }}
                        />
                    </SettingRow>
                </SettingDependents>
            ) : null}
        </SettingsGroup>
    );
}
