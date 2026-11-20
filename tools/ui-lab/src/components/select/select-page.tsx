import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { BasicoDemo } from './basico.js';
import basicoCode from './basico.tsx?raw';
import { EstadosDemo } from './estados.js';
import estadosCode from './estados.tsx?raw';

const SELECT_API = [
    {
        name: 'options',
        type: 'readonly Option[]',
        note: '{ value, label, disabled? }. El orden de la lista es el orden del array.',
    },
    {
        name: 'value',
        type: 'string',
        note: "El elegido; undefined o '' muestran el placeholder. El gatillo es controlado toda su vida.",
    },
    {
        name: 'onValueChange',
        type: '(value: string) => void',
        note: 'Avisa con el value de la opción.',
    },
    { name: 'placeholder', type: 'string', note: 'Lo que se lee sin elección; va atenuado.' },
    { name: 'label', type: 'string', note: 'El nombre accesible del gatillo; la lista lo hereda.' },
    {
        name: 'disabledReason',
        type: 'string',
        note: 'El motivo que el tooltip dice sobre un gatillo apagado.',
    },
] as const;

/** Elige un valor de una lista propia, sin el select nativo del sistema. */
export function SelectPage() {
    return (
        <DocPage
            lead="Elige un valor de una lista cerrada. El gatillo mide lo que un campo y la lista
                flota sobre lo que la abrió, al menos tan ancha como él. La línea elegida va en
                peso, no en glifo. Sin elección muestra el placeholder atenuado; con error toma el
                borde del campo; apagado dice su motivo en el tooltip. El foco del teclado recorre
                la lista con las flechas y elige con Enter, como el nativo: la línea recorrida se
                vela en gris, sin contorno, y mide lo que un control."
            title="Select"
        >
            <Demo
                code={basicoCode}
                heading="Elegir un valor"
                intent="Abre la lista y elige: la línea activa va en peso y nada se le añade."
            >
                <BasicoDemo />
            </Demo>

            <Demo
                code={estadosCode}
                heading="Los cuatro estados"
                intent="Con valor, sin elegir, con error y apagado con motivo. El gatillo mide lo mismo en los cuatro."
                layout="stretch"
            >
                <EstadosDemo />
            </Demo>

            <DocSection heading="API" intent="Controlado siempre; la lista no guarda estado.">
                <ApiTable caption="Props de Select" rows={SELECT_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        La línea elegida se marca con peso, nunca con un glifo: sin columna
                        reservada, las listas de palabras quedan flush.
                    </li>
                    <li>
                        Para siete opciones o más: un campo con sugerencias, no una lista larga.
                    </li>
                    <li>
                        Sin elección el placeholder va atenuado; un valor elegido nunca lo lleva.
                    </li>
                    <li>
                        Apagado siempre con motivo:{' '}
                        <code className="font-mono text-xs">disabledReason</code> alimenta el
                        tooltip.
                    </li>
                    <li>El value es el id estable de la opción; el label puede cambiar.</li>
                    <li>Dentro de un Field hereda id, mensaje y error por contexto.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
