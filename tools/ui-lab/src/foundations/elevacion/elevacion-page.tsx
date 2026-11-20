import sombrasCode from './sombras.tsx?raw';
import { SombrasDemo } from './sombras.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';

export function ElevacionPage() {
    return (
        <DocPage
            lead="La elevación no es un gradiente de cuatro niveles: es la distancia a la que flota
                lo que no está pegado. La lleva la sombra; la superficie semántica pone el papel, y
                las dos cosas se eligen juntas pero se nombran por separado."
            title="Elevación"
        >
            <Demo
                code={sombrasCode}
                heading="Las cuatro sombras"
                intent="El mismo panel, cuatro distancias. En oscuro la sombra apenas se ve: ahí la elevación la carga la superficie."
            >
                <SombrasDemo />
            </Demo>

            <DocSection
                heading="Las parejas que van juntas"
                intent="Cada sombra tiene su superficie: una pareja por nivel, sin mezclas."
            >
                <ul className="flex flex-col gap-gap-control text-sm">
                    {[
                        {
                            pair: 'shadow-none + surface-card',
                            use: 'la tarjeta: sin sombra, la separa del marco el tono y su borde tenue',
                        },
                        {
                            pair: 'shadow-popover + surface-raised',
                            use: 'Popover, Tooltip, Menu, el hover del editor',
                        },
                        {
                            pair: 'shadow-dialog + surface-dialog',
                            use: 'Dialog y sus porciones flotantes',
                        },
                        {
                            pair: 'shadow-drag + surface-raised',
                            use: 'la pestaña o el panel bajo el puntero de arrastre',
                        },
                    ].map((entry) => (
                        <li className="flex gap-gap-control" key={entry.pair}>
                            <code className="w-64 shrink-0 font-mono text-xs">{entry.pair}</code>
                            <span className="text-text-secondary">{entry.use}</span>
                        </li>
                    ))}
                </ul>
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        La sombra no sustituye al borde: lo flotante lleva también su línea. Lo que
                        solo tiene sombra parece un error de recorte.
                    </li>
                    <li>
                        Un botón lleno no lleva sombra ni en hover: el relleno ya dice qué es.
                        Relleno y contorno nunca a la vez.
                    </li>
                    <li>
                        En claro la sombra separa; en oscuro separan la superficie y el borde. Por
                        eso se revisan los dos temas siempre.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
