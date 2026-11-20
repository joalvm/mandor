import { ApiTable } from '../../pieces/api-table.js';
import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { CamposDemo } from './campos.js';
import camposCode from './campos.tsx?raw';
import { ListadoDemo } from './listado.js';
import listadoCode from './listado.tsx?raw';

const TABLE_API = [
    {
        name: 'columns',
        type: 'readonly TableColumn[]',
        note: 'Fijas por tamaño o fluidas con un mínimo y un peso; las fluidas se arrastran.',
    },
    { name: 'label', type: 'string', note: 'De qué es la tabla: el nombre que anuncia.' },
    {
        name: 'rowHover',
        type: 'boolean',
        def: 'true',
        note: 'Si la fila se vela bajo el puntero. Una tabla de campos dice que no.',
    },
] as const;

const ROW_ACTIONS_API = [
    {
        name: 'reveal',
        type: "'hover' | 'always'",
        def: "'hover'",
        note: 'TableRowActions: al apuntar o enfocar la fila, o siempre, en un listado.',
    },
    {
        name: 'label',
        type: 'string',
        note: 'TableTools: el nombre de la columna de acciones para un lector de pantalla.',
    },
] as const;

/** La tabla común de la ventana, en sus dos usos. Su diseño está cerrado. */
export function TablePage() {
    return (
        <DocPage
            lead="Una sola tabla para toda la ventana, en dos usos: el listado, donde cada fila es
                algo sobre lo que se actúa, y la tabla de campos, donde cada celda se escribe. La
                tabla es blanca y sólida sobre su tarjeta, y las columnas fluidas se arrastran
                desde su borde derecho."
            title="Table"
        >
            <Demo
                code={listadoCode}
                heading="Un listado"
                intent='Las acciones de cada fila están siempre a la vista (reveal="always") y la fila se vela al apuntarla.'
            >
                <ListadoDemo />
            </Demo>

            <Demo
                code={camposCode}
                heading="Una tabla de campos"
                intent="La fila no se vela: cada campo responde solo. Quitar aparece al apuntar la fila o al llegar con Tab."
            >
                <CamposDemo />
            </Demo>

            <DocSection heading="API" intent="La tabla y sus dos piezas de acciones.">
                <ApiTable caption="Props de Table" rows={TABLE_API} />
                <ApiTable caption="Props de TableRowActions y TableTools" rows={ROW_ACTIONS_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>El diseño de la tabla está cerrado: se usa como está, no se repinta.</li>
                    <li>
                        Un listado enseña sus acciones siempre; una tabla de campos, al apuntar.
                    </li>
                    <li>
                        Ningún gris de panel debajo: la tabla es blanca sobre la tarjeta, con la
                        cabecera en texto secundario.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
