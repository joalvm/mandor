import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { Compartido } from './compartido.js';
import compartidoCode from './compartido.tsx?raw';
import { Escritura } from './escritura.js';
import escrituraCode from './escritura.tsx?raw';

const CODE_EDITOR_API = [
    {
        name: 'labels',
        type: '{ editor }',
        def: '—',
        note: 'El nombre del editor. Lo dice quien lo monta, no el paquete; el menú es de Monaco.',
    },
    {
        name: 'language',
        type: "'binary' | 'html' | 'json' | 'jsonc' | 'markdown' | 'xml'",
        def: '—',
        note: 'El idioma del documento. `binary` fuerza solo lectura: los bytes son lo que llegó.',
    },
    {
        name: 'modelKey',
        type: 'string',
        def: '—',
        note: 'La clave del documento. Dos vistas de una clave comparten texto y deshacer.',
    },
    {
        name: 'value',
        type: 'string',
        def: '—',
        note: 'El documento. Un cambio de fuera lo reescribe: un revert vuelve sin teclear.',
    },
    {
        name: 'onValueChange',
        type: '(value: string) => void',
        def: '—',
        note: 'Cada tecla. Un editor solo de lectura no la recibe y no cuenta lo que se escribe.',
    },
    {
        name: 'options',
        type: 'EditorOptions',
        def: '{}',
        note: 'readOnly, lineNumbers, wordWrap, variables, check, schemaLint, suggest, fontSize.',
    },
    {
        name: 'onScroll',
        type: '() => void',
        def: '—',
        note: 'Cada movimiento de la vista: una segunda vista del texto lo sigue.',
    },
    {
        name: 'ref',
        type: 'CodeEditorHandle',
        def: '—',
        note: 'run(orden), showLine(línea) y topLine(). Las órdenes grandes las corren los botones del montador.',
    },
] as const;

/** El editor único de la app, con su menú contextual y sus modelos por clave. */
export function CodeEditorPage() {
    return (
        <DocPage
            lead="El único editor de la app: JSON con comentarios, XML, HTML, markdown y el vuelco de una trama. Nadie monta Monaco por su cuenta."
            title="CodeEditor"
        >
            <DocSection heading="Escribiendo">
                <Demo
                    code={escrituraCode}
                    heading="Carga útil en JSONC"
                    intent="Las marcas del idioma aparecen solas; el menú del clic derecho copia y pega."
                >
                    <Escritura />
                </Demo>
            </DocSection>
            <DocSection heading="Un documento, dos vistas">
                <Demo
                    code={compartidoCode}
                    heading="Modelo compartido por clave"
                    intent="Escribe en la izquierda: la derecha sigue porque las dos montan la misma modelKey."
                >
                    <Compartido />
                </Demo>
            </DocSection>
            <DocSection heading="API">
                <ApiTable caption="Props de CodeEditor" rows={CODE_EDITOR_API} />
            </DocSection>
            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-control pl-6 text-sm text-text-secondary">
                    <li>
                        Un solo editor: lo que cambia entre usos son las opciones del montador,
                        nunca la pieza.
                    </li>
                    <li>
                        Un texto solo de lectura no cuenta nada de lo que se escriba: no avisa de
                        cambios y no pega.
                    </li>
                    <li>
                        Las órdenes grandes —formatear, ir a una línea— las corren los botones de
                        quien lo monta con el handle. El clic derecho abre el menú de Monaco.
                    </li>
                    <li>
                        El editor se ve como Monaco lo trae: tema{' '}
                        <code className="font-mono text-xs">vs</code> o{' '}
                        <code className="font-mono text-xs">vs-dark</code> según la ventana, en la
                        fuente mono del producto. Una variable dentro del editor solo va en cursiva
                        y conserva el color del texto (
                        <code className="font-mono text-xs">editor.css</code>).
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
