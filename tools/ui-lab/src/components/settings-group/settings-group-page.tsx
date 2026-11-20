import { ApiTable } from '../../pieces/api-table.js';
import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { AjustesAppDemo } from './ajustes-app.js';
import ajustesAppCode from './ajustes-app.tsx?raw';
import { HeredadoDemo } from './heredado.js';
import heredadoCode from './heredado.tsx?raw';

const GROUP_API = [
    { name: 'title', type: 'string', note: 'SettingsGroup: el nombre de la sección.' },
    { name: 'label', type: 'string', note: 'SettingRow: qué es el ajuste; nombra al control.' },
    { name: 'help', type: 'string', note: 'SettingRow: qué cambia; describe al control.' },
    {
        name: 'inherits',
        type: 'SettingInheritance',
        note: 'SettingRow: de dónde sale el valor mientras la fila no guarda el suyo.',
    },
    {
        name: 'stacked',
        type: 'boolean',
        def: 'false',
        note: 'SettingRow: el control va debajo del texto, para una lista o una línea larga.',
    },
] as const;

/** Los grupos de ajustes: una lista de filas, nombre a la izquierda y control a la derecha. */
export function SettingsGroupPage() {
    return (
        <DocPage
            lead="Una sección de ajustes es una lista: el nombre y lo que significa a la izquierda,
                el control en su propia columna contra el borde derecho, así que todos los
                controles de la sección terminan en la misma línea. Ninguna caja alrededor."
            title="SettingsGroup"
        >
            <Demo
                code={ajustesAppCode}
                heading="En Ajustes"
                intent="Una línea fina bajo el título y entre filas: la pone el marco de Ajustes, no el grupo."
            >
                <AjustesAppDemo />
            </Demo>

            <Demo
                code={heredadoCode}
                heading="Un valor heredado"
                intent="La línea bajo el control dice de dónde sale el valor; al guardar uno propio, ofrece devolverlo."
            >
                <HeredadoDemo />
            </Demo>

            <DocSection heading="API" intent="El grupo y su fila.">
                <ApiTable caption="Props de SettingsGroup y SettingRow" rows={GROUP_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Sin caja ni borde alrededor del grupo: separan el aire y, en Ajustes, una
                        línea.
                    </li>
                    <li>
                        Opciones con interruptor, nunca con casilla; el control, alineado a la
                        derecha.
                    </li>
                    <li>Se guarda al cambiar: ningún botón Guardar al pie.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
