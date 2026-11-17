import composicionCode from './composicion.tsx?raw';
import { ComposicionDemo } from './composicion.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TokenTable } from '../../pieces/token-table.js';

const GAPS: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-gap-tight',
        utility: 'gap-gap-tight',
        note: '4 px — pegado: la etiqueta y su mensaje de campo',
    },
    {
        token: '--mandor-gap-icon-text',
        utility: 'gap-gap-icon-text',
        note: '6 px — un icono y el texto que nombra',
    },
    {
        token: '--mandor-gap-control',
        utility: 'gap-gap-control',
        note: '8 px — entre controles hermanos',
    },
    {
        token: '--mandor-gap-group',
        utility: 'gap-gap-group',
        note: '16 px — entre grupos y entre demos',
    },
    {
        token: '--mandor-gap-section',
        utility: 'gap-gap-section',
        note: '24 px — entre secciones de una vista',
    },
];

const PADS: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-pad-inline-control',
        utility: 'px-pad-control',
        note: '8 px — dentro de un control: caja, botón, fila',
    },
    {
        token: '--mandor-pad-inline-panel',
        utility: 'p-pad-panel',
        note: '12 px — dentro de un panel y de este lienzo',
    },
    {
        token: '--mandor-pad-inline-dialog',
        utility: 'p-pad-dialog',
        note: '16 px — dentro de un diálogo',
    },
    {
        token: '--mandor-indent-tree',
        utility: 'pl-indent-tree',
        note: '12 px — un nivel del árbol',
    },
];

export function EspaciadoPage() {
    return (
        <DocPage
            lead="Todo el aire de la interfaz sale de dos series cerradas: los huecos, que separan
                cosas distintas, y los pads, que visten una caja por dentro. Ningún margen o
                padding fuera de ellos."
            title="Espaciado"
        >
            <Demo
                code={composicionCode}
                heading="Una composición real"
                intent="Panel con pad de panel; etiqueta, ayuda y error a gap tight; campos a gap de grupo; botones hermanos a gap de control."
            >
                <ComposicionDemo />
            </Demo>

            <DocSection
                heading="Los huecos"
                intent="Separan piezas distintas. La muestra materializa el hueco entre dos cajas iguales: lo pintado en medio es el token."
            >
                <TokenTable caption="Los huecos" preview="gap" rows={GAPS} />
            </DocSection>

            <DocSection
                heading="Los pads"
                intent="Visten por dentro: control, panel y diálogo. La muestra viste una caja con el pad, pintando lo que la caja deja dentro."
            >
                <TokenTable caption="Los pads" preview="pad" rows={PADS} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El hueco lo pide la relación, no el ojo: dos controles hermanos son{' '}
                        <code className="font-mono text-xs">gap-gap-control</code> siempre, en
                        cualquier vista.
                    </li>
                    <li>
                        El <code className="font-mono text-xs">gap</code> de flex y grid manda sobre
                        el margen: un margen adhesivo viaja con la caja equivocada.
                    </li>
                    <li>
                        Todo escala de cuatro: no existe el hueco de 10. Un hueco nuevo es un token
                        nuevo con motivo.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
