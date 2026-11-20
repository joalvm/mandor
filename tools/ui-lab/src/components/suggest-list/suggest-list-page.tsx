import { ApiTable } from '../../pieces/api-table.js';
import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { VariablesDemo } from './variables.js';
import variablesCode from './variables.tsx?raw';

const SUGGEST_API = [
    {
        name: 'options',
        type: 'readonly SuggestOption[]',
        note: 'El nombre y, si lo hay, una pista; nunca un secreto.',
    },
    {
        name: 'activeName',
        type: 'string | null',
        note: 'El resaltado de ahora; el teclado sigue en el campo.',
    },
    { name: 'onPick', type: '(name) => void', note: 'Devuelve un nombre: el campo lo escribe.' },
    {
        name: 'onHighlight',
        type: '(name) => void',
        note: 'El puntero se une al teclado y mueve el resaltado.',
    },
    { name: 'label', type: 'string', note: 'El nombre de la lista para un lector de pantalla.' },
    {
        name: 'scrollable',
        type: 'boolean',
        def: 'false',
        note: 'Una lista larga se para en unas filas y se desplaza por dentro.',
    },
] as const;

/** La lista de sugerencias que cuelga de un campo. */
export function SuggestListPage() {
    return (
        <DocPage
            lead="La lista de nombres que un campo sugiere mientras se escribe una variable. Va dentro
                de un Popover sin modal, cuelga del campo y nunca le quita el foco: el campo escribe,
                la lista solo señala."
            title="SuggestList"
        >
            <Demo
                code={variablesCode}
                heading="Variables de un campo"
                intent="Las flechas mueven el resaltado, Enter elige y Escape cierra; al escribir «{{» vuelve a abrir."
                layout="center"
            >
                <VariablesDemo />
            </Demo>

            <DocSection heading="API" intent="Lo que la lista recibe y lo que devuelve.">
                <ApiTable caption="Props de SuggestList" rows={SUGGEST_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El foco se queda en el campo; la lista no entra en el orden de tabulación.
                    </li>
                    <li>El resaltado es gris, como toda selección; el acento no entra.</li>
                    <li>Un nombre que no existe no se bloquea: queda escrito como texto.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
