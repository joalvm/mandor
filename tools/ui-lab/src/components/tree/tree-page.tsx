import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TREE_INDENT } from '@mandor/ui';
import exploradorCode from './explorador.tsx?raw';
import { ExploradorDemo } from './explorador.js';

const TREE_API = [
    {
        name: 'lines',
        type: 'readonly TreeLine[]',
        note: 'Las líneas visibles, ya aplanadas y en orden. El dueño las baja de sus nodos.',
    },
    {
        name: 'chevrons',
        type: 'boolean',
        note: 'Cada carpeta dibuja su chevron en el hueco de la fila, girado si está abierta. Por defecto no: el lateral no lo lleva.',
    },
    {
        name: 'selected',
        type: 'readonly string[]',
        note: 'Los ids tomados. Sin él, el árbol no selecciona y no escribe aria-selected.',
    },
    {
        name: 'onExpandedChange',
        type: '(id: string, expanded: boolean) => void',
        note: 'Obligatorio: plegar no es opcional. El dueño rehace sus líneas.',
    },
    {
        name: 'onActivate',
        type: '(id: string) => void',
        note: 'Un clic simple o Enter. El dueño decide qué es activar.',
    },
    {
        name: 'onSelectedChange',
        type: '(ids: string[]) => void',
        note: 'Ctrl añade o quita; Shift toma el rango desde el ancla.',
    },
    {
        name: 'onDelete',
        type: '(ids: string[]) => void',
        note: 'Supr. Si el foco está dentro de la selección, borra la selección entera.',
    },
] as const;

const TREE_LINE_API = [
    {
        name: 'id',
        type: 'string',
        note: 'El nombre del nodo para el árbol: selección, foco y claves.',
    },
    {
        name: 'level',
        type: 'number',
        note: 'Uno en la raíz, uno más por carpeta encima. Es la sangría.',
    },
    {
        name: 'expanded',
        type: 'boolean | undefined',
        note: 'Solo en carpeta. Una cerrada sigue plegando; una hoja nunca lleva la prop.',
    },
] as const;

const TREE_ROW_API = [
    {
        name: 'children',
        type: 'ReactNode',
        note: 'El glifo del nodo, su RowLabel y lo que cuelga. Nada de props: el árbol manda.',
    },
] as const;

/** El árbol de nodos que otro posee: denso, con guías y un solo teclado para todos. */
export function TreePage() {
    return (
        <DocPage
            lead={`El árbol de todas las colecciones de la ventana, al modo del explorador de VS Code:
                filas densas de 22, guías que bajan por el centro del hueco que cada nivel reserva,
                glifos que no cambian al abrir y, salvo que se pida, ningún chevron — la única
                flecha es la de la sección, y una carpeta se pliega donde se clicaa. Un paso de sangría mide ${String(TREE_INDENT)} píxeles,
                la misma medida para dibujar y para calcular.`}
            title="Tree"
        >
            <Demo
                code={exploradorCode}
                heading="La colección, como en el explorador"
                intent="Un clic sobre la carpeta la pliega y la toma; Ctrl añade; Shift toma el rango; ← → pliegan desde el teclado. Pliega una carpeta con algo tomado dentro: la selección suelta lo que se esconde."
            >
                <ExploradorDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="El dueño de los nodos manda líneas; el árbol devuelve órdenes."
            >
                <ApiTable caption="Props de Tree" rows={TREE_API} />
                <ApiTable caption="El contrato de TreeLine" rows={TREE_LINE_API} />
                <ApiTable caption="Props de TreeRow" rows={TREE_ROW_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Qué está abierto y qué está tomado lo guarda el dueño; el árbol no se queda
                        copia que pueda desincronizarse. Los hijos son un TreeRow por línea, en el
                        mismo orden.
                    </li>
                    <li>
                        Sin <code className="font-mono text-xs">chevrons</code> ninguna fila lleva
                        chevron: la única flecha es la de la cabecera de la sección. Con él, el
                        chevron ocupa el hueco que la fila ya reserva y no es un control: activar
                        una carpeta es plegarla — un clic sobre ella — y las flechas laterales lo
                        hacen desde el teclado. La guía de una carpeta abierta nace bajo su chevron,
                        en la primera línea de sus hijos; una plegada no la lleva.
                    </li>
                    <li>
                        Una sola parada de tabulador: la línea con foco, o la primera tomada, o la
                        primera dibujada. Foco y selección son cosas distintas: las flechas mueven
                        el foco sin tocar la selección, salvo con Shift.
                    </li>
                    <li>
                        <code className="font-mono text-xs">→</code> abre o baja al primer hijo;{' '}
                        <code className="font-mono text-xs">←</code> cierra o sube al padre;{' '}
                        <code className="font-mono text-xs">Inicio</code> y{' '}
                        <code className="font-mono text-xs">Fin</code> a los extremos;{' '}
                        <code className="font-mono text-xs">Ctrl+A</code> toma todas;{' '}
                        <code className="font-mono text-xs">Esc</code> vacía — y sin nada tomado, el
                        árbol no la atiende.
                    </li>
                    <li>
                        Al plegar no queda nada oculto tomado ni con foco: la selección suelta lo
                        que se esconde y el foco vuelve a la carpeta que lo tragó.
                    </li>
                    <li>
                        Solo están en el DOM las líneas en pantalla, más ocho por lado. La línea con
                        foco sigue dibujada aunque salga de la vista: quitarla mandaría el foco a la
                        página.
                    </li>
                    <li>
                        Una tecla pulsada en un control dentro de la línea la atiende el control, no
                        el árbol. <code className="font-mono text-xs">Alt</code> queda libre entero:
                        la colección lo usa para mover nodos.
                    </li>
                    <li>
                        Sin type-ahead: el árbol no conoce los nombres de sus líneas, solo sus ids.
                        Si la colección lo pide algún día, llega con su plan.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
