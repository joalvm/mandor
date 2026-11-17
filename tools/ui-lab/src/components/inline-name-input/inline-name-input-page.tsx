import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import listaCode from './lista.tsx?raw';
import { ListaDemo } from './lista.js';
import { PestanasDemo } from './pestanas.js';
import pestanasCode from './pestanas.tsx?raw';

const INLINE_API = [
    {
        name: 'value',
        type: 'string',
        note: 'El nombre vigente; entra al montarse y a cada renombrado.',
    },
    {
        name: 'onCommit',
        type: '(value: string) => boolean',
        note: 'Enter o salir del campo. Devuelve false si el borrador no vale y el campo sigue abierto.',
    },
    {
        name: 'onCancel',
        type: '() => void',
        note: 'Escape. La fila recupera su nombre sin avisar.',
    },
    { name: 'label', type: 'string', note: 'El nombre accesible de la línea.' },
    {
        name: 'autoFocus',
        type: 'boolean',
        def: 'true',
        note: 'Al montarse enfoca y selecciona todo.',
    },
] as const;

/** Edita el nombre de una fila en su sitio, sin modal ni formulario. */
export function InlineNameInputPage() {
    return (
        <DocPage
            lead="El nombre de una fila que se edita donde está. No lleva borde ni alto propio —
                es el texto de la fila, con la tipografía y la línea que tenía, sobre una
                superficie sólida — y el anillo de foco alrededor. Lo que pasa dentro del campo no
                sale del campo: un click que pone el caret no es un click en la fila, y un doble
                click que toma una palabra no empieza otro renombrado."
            title="InlineNameInput"
        >
            <Demo
                code={listaCode}
                heading="En la lista"
                intent="El glifo de la fila o doble click sobre el nombre. Vacía el nombre y pulsa Enter: la fila lo rechaza y el borrador queda subrayado; al teclear, se limpia."
                layout="stretch"
            >
                <ListaDemo />
            </Demo>

            <Demo
                code={pestanasCode}
                heading="En las pestañas"
                intent="Doble click sobre una pestaña: el nombre se edita dentro de la pestaña, la tira no se mueve y la activa no cambia. Enter guarda, Escape suelta."
                layout="stretch"
            >
                <PestanasDemo />
            </Demo>

            <DocSection heading="API" intent="El estado del borrador vive dentro del campo.">
                <ApiTable caption="Props de InlineNameInput" rows={INLINE_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Solo reemplaza al texto. Lo demás de la fila — glifos, botones, contadores —
                        permanece en el suyo: quien mira debe ver que cambia el nombre, no la fila.
                    </li>
                    <li>
                        No lleva borde ni alto propio: la altura y la tipografía son las de la línea
                        que reemplazó, sobre una superficie sólida — el hover de la fila no se cuela
                        detrás. El foco es el anillo; un borrador rechazado, el subrayado ondulado.
                    </li>
                    <li>
                        <code className="font-mono text-xs">onCommit</code> devuelve boolean: es la
                        fila la que valida, el campo solo pinta el veredicto.
                    </li>
                    <li>Un borrador rechazado no se descarta: queda a mano hasta que valga.</li>
                    <li>Escape cancela siempre, incluso con un borrador rechazado encima.</li>
                    <li>Pega texto llano y nada más; el portapapeles rico no entra.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
