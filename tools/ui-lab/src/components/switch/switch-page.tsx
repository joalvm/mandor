import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { AjusteDemo } from './ajuste.js';
import ajusteCode from './ajuste.tsx?raw';
import { EstadosDemo } from './estados.js';
import estadosCode from './estados.tsx?raw';

const SWITCH_API = [
    { name: 'checked', type: 'boolean', note: 'El estado. Un switch es binario: no hay mixed.' },
    {
        name: 'label',
        type: 'string',
        note: 'El nombre de lo que se enciende; anuncia el estado con aria-checked.',
    },
    { name: 'onCheckedChange', type: '(checked: boolean) => void', note: 'Avisa al soltar.' },
    {
        name: 'disabled',
        type: 'boolean',
        def: 'false',
        note: 'Apagado; el relleno pierde el estado.',
    },
] as const;

/** Un ajuste de dos lados: píldora y perilla, y el estado en el relleno. */
export function SwitchPage() {
    return (
        <DocPage
            lead='Un ajuste que se enciende o se apaga: una píldora que desliza su perilla al lado
                que significa. El estado lo pinta el relleno — gris apagado, acento encendido — y
                lo anuncia role="switch" con aria-checked. El label es el nombre de lo que se
                gira, nunca la descripción del giro.'
            title="Switch"
        >
            <Demo
                code={estadosCode}
                heading="Los cuatro estados"
                intent="Apagado, encendido y sus dos fijos. El relleno gris no dice nada del estado; el acento, sí."
            >
                <EstadosDemo />
            </Demo>

            <Demo
                code={ajusteCode}
                heading="En una fila de ajustes"
                intent="El switch queda suelto a la derecha: la etiqueta y la ayuda las pone el Field."
                layout="stretch"
            >
                <AjusteDemo />
            </Demo>

            <DocSection heading="API" intent="Controlado siempre; el switch no guarda estado.">
                <ApiTable caption="Props de Switch" rows={SWITCH_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El estado va en el relleno y en{' '}
                        <code className="font-mono text-xs">aria-checked</code>: nunca solo en uno
                        de los dos.
                    </li>
                    <li>
                        Sin estado intermedio: lo que es «parcial» es un Checkbox mixed, no esto.
                    </li>
                    <li>
                        El efecto se aplica al instante: un switch que exige «Guardar» es un
                        checkbox.
                    </li>
                    <li>
                        Dentro de un Field hereda id y mensaje por contexto; solo no lleva nada.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
