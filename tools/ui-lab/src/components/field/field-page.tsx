import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { ErrorAyudaDemo } from './error-ayuda.js';
import errorAyudaCode from './error-ayuda.tsx?raw';
import { EstadosDemo } from './estados.js';
import estadosCode from './estados.tsx?raw';

const FIELD_API = [
    {
        name: 'id',
        type: 'string',
        note: 'El id del control de dentro; el mensaje se compone a partir de él. Obligatorio.',
    },
    { name: 'label', type: 'string', note: 'La etiqueta visible, atada al control por htmlFor.' },
    {
        name: 'help',
        type: 'string',
        note: 'La línea de ayuda de debajo; cede su sitio si llega error.',
    },
    {
        name: 'error',
        type: 'string',
        note: 'Pinta el borde de error, anuncia con role="alert" y marca el control inválido.',
    },
    {
        name: 'children',
        type: 'ReactNode',
        note: 'El control. Lo escribe quien llama; el cableado viaja por contexto, sin clonar props.',
    },
] as const;

/** El ámbito del error: etiqueta, un control y el mensaje que los ata. */
export function FieldPage() {
    return (
        <DocPage
            lead="El ámbito del error más pequeño del sistema. Field pone la etiqueta y una línea de
                mensaje — ayuda o error, nunca los dos a la vez — y ata las tres cosas por
                aria-describedby y htmlFor. El control se escribe dentro: cualquier campo de esta
                biblioteca queda cableado solo por estar ahí, sin clonar props."
            title="Field"
        >
            <Demo
                code={estadosCode}
                heading="Los cuatro estados"
                intent="En blanco, con ayuda, con error y apagado con motivo. El borde de error lo pinta el control leyendo el campo."
                layout="stretch"
            >
                <EstadosDemo />
            </Demo>

            <Demo
                code={errorAyudaCode}
                heading="El error en el sitio de la ayuda"
                intent="Compara las alturas: el campo con error mide lo mismo. El error repite la regla de la ayuda."
                layout="stretch"
            >
                <ErrorAyudaDemo />
            </Demo>

            <DocSection heading="API" intent="Todas las props; Field no recibe handlers ni estado.">
                <ApiTable caption="Props de Field" rows={FIELD_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>Ayuda y error comparten línea: el campo no crece al equivocarse.</li>
                    <li>
                        El mensaje de error lleva{' '}
                        <code className="font-mono text-xs">role="alert"</code>: se anuncia en
                        cuanto aparece.
                    </li>
                    <li>
                        El error dice qué corregir: «Debe estar entre 1 y 65535», no «Valor
                        inválido».
                    </li>
                    <li>
                        Field pinta el error que recibe; decidir cuándo hay error es cosa de la
                        feature.
                    </li>
                    <li>
                        Mostrar el error no toca el valor: lo escrito sigue y se corrige, no se
                        reescribe.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
