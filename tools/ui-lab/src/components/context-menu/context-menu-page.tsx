import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { EditorDemo } from './editor.js';
import editorCode from './editor.tsx?raw';

const CONTEXT_MENU_API = [
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Trigger y contenido, escritos dentro como hermanos: son dos lugares, no dos valores.',
    },
] as const;

const CONTEXT_TRIGGER_API = [
    {
        name: 'children',
        type: 'ReactElement',
        note: 'La superficie entera: ella es el disparador, y el menú abre donde cayó el puntero.',
    },
] as const;

const CONTEXT_ITEM_API = [
    {
        name: 'onSelect',
        type: '() => void',
        note: 'La orden de la línea. Texto solo: este menú se mide en sus palabras y no dibuja columnas.',
    },
    {
        name: 'disabledReason',
        type: 'string',
        note: 'El motivo que la línea apagada dice al pasar el puntero.',
    },
] as const;

/** Las órdenes de una superficie, al alcance del puntero. */
export function ContextMenuPage() {
    return (
        <DocPage
            lead="Las órdenes de una superficie, donde cayó el puntero. Mismo corte que el Menu —
                misma altura de línea, mismo texto— pero no cuelga de un botón: la superficie
                entera es el disparador. Sus líneas son texto y nada más, porque el menú se mide
                en sus palabras."
            title="ContextMenu"
        >
            <Demo
                code={editorCode}
                heading="Sobre una línea del editor"
                intent="Click derecho sobre la línea: las órdenes del editor, con la apagada diciendo por qué y la destructiva al final, tras separador, con puntos suspensivos."
            >
                <EditorDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Cinco piezas, el mismo árbol del Menu sin botón: la superficie es el disparador."
            >
                <ApiTable caption="Props de ContextMenu" rows={CONTEXT_MENU_API} />
                <ApiTable caption="Props de ContextMenuTrigger" rows={CONTEXT_TRIGGER_API} />
                <ApiTable caption="Props de ContextMenuItem" rows={CONTEXT_ITEM_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Mismo corte que el Menu: líneas de 24 en el mismo texto, apagada con motivo,
                        destructiva al final con puntos suspensivos y sin rojo.
                    </li>
                    <li>
                        Texto solo, sin atajos ni columnas: el menú se mide en sus palabras y se
                        abre donde cayó el puntero.
                    </li>
                    <li>
                        No es el único camino de una orden: lo que vive aquí, vive también en el
                        menú del título o en la paleta, porque el teclado no hace click derecho.
                    </li>
                    <li>Superficie sin órdenes, sin menú: nada de un menú con una sola línea.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
