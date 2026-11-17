import apiladasCode from './apiladas.tsx?raw';
import { ApiladasDemo } from './apiladas.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TokenTable } from '../../pieces/token-table.js';

const LAYERS: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-z-base',
        utility: 'z-base',
        note: '0 — el contenido: es el z-index que no se escribe',
    },
    { token: '--mandor-z-sticky', utility: 'z-sticky', note: '10 — la cabecera que se queda' },
    {
        token: '--mandor-z-splitter',
        utility: 'z-splitter',
        note: '20 — el divisor de un split, por encima de su mitad',
    },
    { token: '--mandor-z-dialog', utility: 'z-dialog', note: '100 — el diálogo y su veladura' },
    { token: '--mandor-z-popover', utility: 'z-popover', note: '200 — Popover y Tooltip de Panel' },
    {
        token: '--mandor-z-dropdown',
        utility: 'z-dropdown',
        note: '300 — el menú que abre un popover',
    },
    {
        token: '--mandor-z-tooltip',
        utility: 'z-tooltip',
        note: '400 — el tooltip, por encima de todo lo que abrió',
    },
    {
        token: '--mandor-z-toast',
        utility: 'z-toast',
        note: '500 — el toast, que no espera a nadie',
    },
    {
        token: '--mandor-z-drag',
        utility: 'z-drag',
        note: '600 — lo que sigue al puntero durante un arrastre',
    },
];

export function CapasPage() {
    return (
        <DocPage
            lead="El apilamiento es una escala fija, no una carrera de números crecientes. Cada
                flotante tiene su capa, y una capa nueva solo entra con motivo escrito: aquí están
                las nueve, de lo que no se levanta a lo que persigue al puntero."
            title="Capas"
        >
            <Demo
                code={apiladasCode}
                heading="Las capas flotantes, en desplazamiento"
                intent="Cada caja pinta con su token: la de delante vale más, y ninguna peleó por estarlo."
                layout="start"
            >
                <ApiladasDemo />
            </Demo>

            <DocSection
                heading="Las nueve capas"
                intent="La muestra lee el valor computado del token: lo que ves es lo que un componente leería."
            >
                <TokenTable caption="Las nueve capas" preview="value" rows={LAYERS} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El z-index se pide con la utilidad de la capa, nunca con un número:
                        <code className="font-mono text-xs"> z-[999]</code> no pasa la comprobación.
                    </li>
                    <li>
                        Lo flotante se dibuja en portal y pide su capa: Radix lleva el escape, la
                        utilidad pone la altura.
                    </li>
                    <li>
                        El orden entre capas ya está decidido —diálogo bajo popover, popover bajo
                        dropdown, dropdown bajo tooltip— y no se renegocia por página.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
