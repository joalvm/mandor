import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { EstadosDemo } from './estados.js';
import estadosCode from './estados.tsx?raw';
import { ListaDemo } from './lista.js';
import listaCode from './lista.tsx?raw';

const CHECKBOX_API = [
    {
        name: 'checked',
        type: "boolean | 'indeterminate'",
        note: "El estado. 'indeterminate' resume un grupo cuyos hijos discrepan.",
    },
    {
        name: 'label',
        type: 'string',
        note: 'El nombre accesible; describe qué marca el control, no su estado.',
    },
    {
        name: 'onCheckedChange',
        type: '(checked: boolean) => void',
        note: 'Avisa al soltar. Del mixed se sale hacia true o false, nunca a otro mixed.',
    },
    {
        name: 'disabled',
        type: 'boolean',
        def: 'false',
        note: 'Apagado; pierde el foco y el click.',
    },
    {
        name: 'tabIndex',
        type: 'number',
        note: '\u22121 dentro de una fila de árbol: la fila guarda el único tab stop.',
    },
    {
        name: 'onClick',
        type: 'MouseEventHandler',
        note: 'Para filas que actúan al click; el checkbox frena la caída él solo.',
    },
] as const;

/** La marca de una línea dentro o fuera de lo que la lista representa. */
export function CheckboxPage() {
    return (
        <DocPage
            lead="Marca una línea como dentro o fuera de un conjunto. El estado viaja entero:
                false, true o 'indeterminate' — el padre cuyo padre no sabe — y el control lo
                anuncia como aria-checked false, true o mixed. El relleno de acento y la marca
                dibujan lo mismo que anuncia el nombre accesible."
            title="Checkbox"
        >
            <Demo
                code={estadosCode}
                heading="Los estados"
                intent="Fuera, dentro y mixed, más los dos apagados —el marcado conserva su acento, atenuado— y el inválido, con el borde en error."
            >
                <EstadosDemo />
            </Demo>

            <Demo
                code={listaCode}
                heading="El padre que resume"
                intent="Toca hijos y mira al padre: true con todos, false con ninguno, mixed mientras discrepan."
                layout="stretch"
            >
                <ListaDemo />
            </Demo>

            <DocSection heading="API" intent="Controlado siempre; el checkbox no guarda estado.">
                <ApiTable caption="Props de Checkbox" rows={CHECKBOX_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El mixed se anuncia <code className="font-mono text-xs">mixed</code> y se
                        dibuja con el guion: check es la marca de un estado terminado.
                    </li>
                    <li>El mixed se pinta con el mismo relleno de acento que el marcado.</li>
                    <li>
                        El label nombra la función, no el estado: «Cabeceras de autenticación», no
                        «Marcado».
                    </li>
                    <li>
                        En una fila que actúa al click, la fila guarda el foco y el checkbox toma{' '}
                        <code className="font-mono text-xs">tabIndex=&#123;-1&#125;</code>.
                    </li>
                    <li>
                        Dentro de un Field hereda id, mensaje e inválido por contexto: el borde en
                        error llega solo.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
