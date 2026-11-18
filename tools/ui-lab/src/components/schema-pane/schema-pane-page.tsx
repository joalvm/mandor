import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { Esquema } from './esquema.js';
import esquemaCode from './esquema.tsx?raw';

const SCHEMA_PANE_API = [
    {
        name: 'editor',
        type: '{ key; language; onValueChange; value }',
        def: '—',
        note: 'El documento del montador, por clave y contestado en cada cambio.',
    },
    {
        name: 'labels',
        type: '{ editor; generate? }',
        def: '—',
        note: 'Las palabras del editor y del botón. Sin `generate` no hay botón.',
    },
    {
        name: 'onGenerate',
        type: '() => void',
        def: '—',
        note: 'La generación que ofrece el montador. El panel no sabe de dónde sale el documento.',
    },
    {
        name: 'options',
        type: 'EditorOptions',
        def: '—',
        note: 'Las opciones del editor de abajo, tal cual.',
    },
] as const;

/** Un editor con su tira de acciones: el panel de esquema que montan las pestañas de esquema. */
export function SchemaPanePage() {
    return (
        <DocPage
            lead="Un editor con su tira de acciones para el esquema de una pestaña. El panel no sabe nada del documento: el texto es de quien lo monta y generar pregunta arriba."
            title="SchemaPane"
        >
            <DocSection heading="El panel montado">
                <Demo
                    code={esquemaCode}
                    heading="Esquema con botón de generar"
                    intent="Pulsa generar: la generación es de la demo, el panel solo la ofrece."
                >
                    <Esquema />
                </Demo>
            </DocSection>
            <DocSection heading="API">
                <ApiTable caption="Props de SchemaPane" rows={SCHEMA_PANE_API} />
            </DocSection>
            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-control pl-6 text-sm text-text-secondary">
                    <li>
                        La tira de acciones es una barra de herramientas: alto de sección (32), y
                        solo está ahí mientras haya generación que ofrecer.
                    </li>
                    <li>
                        Pisar un esquema no trivial pide confirmación antes: la decisión es del
                        montador, que conoce el documento; el panel no pregunta solo.
                    </li>
                    <li>
                        Por debajo es un <code className="font-mono text-xs">CodeEditor</code>: un
                        editor, el mismo de toda la app, en el idioma que hable el documento.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
