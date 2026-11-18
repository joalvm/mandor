import { SettingRow, SettingsGroup, Switch, type SettingsEditing } from '@mandor/ui';
import type { ReactNode } from 'react';

import type { AjustesPeticion } from './ajustes.js';

type TlsSectionProps = {
    editing: SettingsEditing<AjustesPeticion>;
};

/** Cuánto se fía el envío del otro extremo. Que la verificación esté apagada se dice en la fila. */
export function TlsSection({ editing }: TlsSectionProps): ReactNode {
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingsGroup title="TLS">
            <SettingRow
                help={
                    values.validateTls
                        ? 'Un certificado que no se verifica detiene el envío.'
                        : 'El envío confía en cualquier certificado que el servidor muestre. Úsalo solo contra un servidor tuyo.'
                }
                inherits={inheritanceOf('validateTls')}
                label="Verificar el certificado TLS"
            >
                <Switch
                    checked={values.validateTls}
                    label="Verificar el certificado TLS"
                    onCheckedChange={(validateTls) => {
                        change({ validateTls });
                    }}
                />
            </SettingRow>
        </SettingsGroup>
    );
}
