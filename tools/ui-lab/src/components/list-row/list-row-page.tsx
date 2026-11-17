import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import listaCode from './lista.tsx?raw';
import { ListaDemo } from './lista.js';
import vaciaCode from './vacia.tsx?raw';
import { VaciaDemo } from './vacia.js';

const LIST_ROW_API = [
    {
        name: 'selected',
        type: 'boolean',
        note: 'La tomada. El estado de la lista vive con la lista, no con la fila.',
    },
    {
        name: 'onSelect',
        type: '(activation: RowActivation) => void',
        note: 'La toma. Lleva los modificadores, para que la lista decida qué es un Ctrl o un Shift.',
    },
    {
        name: 'density',
        type: "'row' | 'line'",
        def: "'row'",
        note: 'Las dos cadencias que tiene una lista de este producto. No hay tercera.',
    },
    {
        name: 'level',
        type: 'number',
        note: 'Cuántos niveles bajo el título de su sección. Reserva el hueco del chevron.',
    },
    {
        name: 'tabIndex',
        type: 'number',
        def: '0',
        note: '-1 cuando el contenedor camina las filas él mismo, como la paleta de órdenes.',
    },
] as const;

const ROW_LABEL_API = [
    {
        name: 'children',
        type: 'string',
        note: 'El nombre. Corta lo que no cabe y lleva el tooltip que lo revela: una sola verdad.',
    },
] as const;

const EMPTY_ROW_API = [
    { name: 'icon', type: 'IconName', note: 'El glifo de lo que falta, a 12.' },
    { name: 'title', type: 'string', note: 'Qué falta, en positivo y corto.' },
    { name: 'description', type: 'string', note: 'El resto de la línea, tras un punto medio.' },
    { name: 'level', type: 'number', note: 'La profundidad de las filas que faltan.' },
] as const;

/** La fila densa, su nombre que se corta solo y la sección vacía en una línea. */
export function ListRowPage() {
    return (
        <DocPage
            lead="La fila es la unidad de toda lista densa: dice lo que es —un glifo, un nombre, lo
                que cuelga al final— y nada de cómo se comporta la lista. Radio 0 y sin sombra: la
                densidad es lo único que un cliente de API no puede permitirse perder."
            title="ListRow"
        >
            <Demo
                code={listaCode}
                heading="La fila en su lista"
                intent="Se toma con el ratón y con Enter; lo que cuelga al final es parte de la fila, no de su nombre. Con nivel, el hueco del chevron existe aunque no haya nada que plegar."
            >
                <ListaDemo />
            </Demo>

            <Demo
                code={vaciaCode}
                heading="La sección sin filas"
                intent="Una línea a la profundidad de las que faltan. Sin salida propia: la cabecera de la sección ya tiene el botón que la llena."
            >
                <VaciaDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="La fila no sabe de qué es lista: el contenedor manda."
            >
                <ApiTable caption="Props de ListRow" rows={LIST_ROW_API} />
                <ApiTable caption="Props de RowLabel" rows={ROW_LABEL_API} />
                <ApiTable caption="Props de EmptyRow" rows={EMPTY_ROW_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>Radio 0 y sin sombra. Filas redondeadas meten aire y bajan la densidad.</li>
                    <li>
                        El nombre es el <code className="font-mono text-xs">RowLabel</code> de
                        dentro, y nada más: una luz de estado y un botón son parte de la fila, no de
                        su nombre. Así anuncia el lector el nombre una sola vez.
                    </li>
                    <li>
                        Un contenedor de este sistema las envuelve en{' '}
                        <code className="font-mono text-xs">role="listbox"</code>: la fila es una
                        opción y <code className="font-mono text-xs">aria-selected</code> su estado.
                    </li>
                    <li>
                        La lista que camina sus filas con teclado propio —la paleta— deja el
                        tabulador fuera: <code className="font-mono text-xs">tabIndex={-1}</code>,
                        igual que el checkbox de una línea del árbol.
                    </li>
                    <li>
                        Las acciones de fila aparecen en hover y permanecen con el foco dentro. Si
                        se van al mover el ratón hacia ellas, no se pueden usar.
                    </li>
                    <li>
                        <code className="font-mono text-xs">EmptyRow</code> no lleva salida: el
                        botón que llena la sección vive en su cabecera, no repetido aquí.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
