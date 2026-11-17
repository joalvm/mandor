import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { TokenTable } from '../../pieces/token-table.js';

const RADII: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-radius-none',
        utility: 'rounded-none',
        note: '0 — lo que se funde con la superficie que lo lleva',
    },
    {
        token: '--mandor-radius-sm',
        utility: 'rounded-sm',
        note: '2 px — la señal pequeña: badge, token de variable',
    },
    {
        token: '--mandor-radius-md',
        utility: 'rounded-md',
        note: '4 px — el control: botón, campo, celda de esta tabla',
    },
    {
        token: '--mandor-radius-lg',
        utility: 'rounded-lg',
        note: '6 px — lo que flota: tooltip, hover del editor',
    },
    {
        token: '--mandor-radius-xl',
        utility: 'rounded-xl',
        note: '12 px — la ventana del lienzo de una demo',
    },
    {
        token: '--mandor-radius-full',
        utility: 'rounded-full',
        note: '9999 px — el punto y la pastilla: StatusDot, switch',
    },
];

export function RadiosPage() {
    return (
        <DocPage
            lead="Seis radios, y cada uno dice cuán cerca del borde está la pieza: del control que
                se funde con su superficie al punto que solo puede ser redondo."
            title="Radios"
        >
            <DocSection
                heading="Los seis"
                intent="La muestra dibuja el radio con su borde: lo que se curva es la esquina del token, no una decisión del dibujo."
            >
                <TokenTable caption="Los seis radios" preview="radius" rows={RADII} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El control normal es <code className="font-mono text-xs">rounded-md</code>:
                        Button, campo, Panel. Un botón con otro radio se lee como otra cosa.
                    </li>
                    <li>
                        El radio lo lleva la pieza, no el recuadro que la envuelve: un lienzo de
                        demo lleva <code className="font-mono text-xs">xl</code> y sus controles
                        siguen en <code className="font-mono text-xs">md</code>.
                    </li>
                    <li>
                        <code className="font-mono text-xs">rounded-full</code> solo para lo que es
                        un punto o una pastilla; en un botón rectangular, no.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
