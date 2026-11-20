import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { TokenTable } from '../../pieces/token-table.js';

const RADII: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-radius-none',
        utility: 'rounded-none',
        note: 'lo que se funde con la superficie que lo lleva',
    },
    {
        token: '--mandor-radius-sm',
        utility: 'rounded-sm',
        note: 'la señal pequeña: badge, token de variable',
    },
    {
        token: '--mandor-radius-md',
        utility: 'rounded-md',
        note: 'el control: botón, campo, celda de esta tabla',
    },
    {
        token: '--mandor-radius-lg',
        utility: 'rounded-lg',
        note: 'el tooltip y el hover del editor',
    },
    {
        token: '--mandor-radius-xl',
        utility: 'rounded-xl',
        note: 'la pestaña de trabajo y la insignia del aviso',
    },
    {
        token: '--mandor-radius-panel',
        utility: 'rounded-panel',
        note: 'la tarjeta, el menú y el popover',
    },
    {
        token: '--mandor-radius-overlay',
        utility: 'rounded-overlay',
        note: 'lo que flota sobre la ventana: diálogo y aviso',
    },
    {
        token: '--mandor-radius-full',
        utility: 'rounded-full',
        note: 'el punto y la pastilla: StatusDot, switch',
    },
];

export function RadiosPage() {
    return (
        <DocPage
            lead="Ocho radios, y cada uno dice cuán cerca del borde está la pieza: del control que
                se funde con su superficie al punto que solo puede ser redondo."
            title="Radios"
        >
            <DocSection
                heading="Los ocho"
                intent="La muestra dibuja el radio con su borde: lo que se curva es la esquina del token, no una decisión del dibujo."
            >
                <TokenTable caption="Los ocho radios" preview="radius" rows={RADII} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El control normal es <code className="font-mono text-xs">rounded-md</code>:
                        Button, campo, Panel. Un botón con otro radio se lee como otra cosa.
                    </li>
                    <li>
                        El radio lo lleva la pieza, no el recuadro que la envuelve: una tarjeta
                        lleva <code className="font-mono text-xs">panel</code> y sus controles
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
