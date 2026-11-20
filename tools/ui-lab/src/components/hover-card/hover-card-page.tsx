import { ApiTable } from '../../pieces/api-table.js';
import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { DesgloseDemo } from './desglose.js';
import desgloseCode from './desglose.tsx?raw';

const HOVER_CARD_API = [
    {
        name: 'HoverCard',
        type: 'children',
        note: 'La raíz: lleva el disparador y el panel, hermanos.',
    },
    {
        name: 'HoverCardTrigger',
        type: 'un elemento',
        note: 'Lo que se apunta; un solo hijo, que recibe los eventos del puntero.',
    },
    {
        name: 'HoverCardPanel',
        type: 'children',
        note: 'Lo que se lee: sólido, con su sombra de capa.',
    },
] as const;

/** La tarjeta que abre una cifra al posarse en ella. */
export function HoverCardPage() {
    return (
        <DocPage
            lead="Una tarjeta que se abre al posarse sobre algo que se explica solo, como una cifra
                del resumen de la respuesta. Abre a los 400 ms y cierra a los 150 ms de salir; un
                clic no la deja abierta y nunca toma el foco: se lee, no se usa."
            title="HoverCard"
        >
            <Demo
                code={desgloseCode}
                heading="El desglose de una cifra"
                intent="Posarse en «120 ms» abre de qué se compone; salir lo cierra."
                layout="center"
            >
                <DesgloseDemo />
            </Demo>

            <DocSection heading="API" intent="Tres piezas, escritas como árbol.">
                <ApiTable caption="Piezas de HoverCard" rows={HOVER_CARD_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>Solo lectura: nada que se pulse dentro. Lo que se usa va en un Popover.</li>
                    <li>
                        Lo que dice también está al alcance sin puntero, en otra parte de la vista.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
