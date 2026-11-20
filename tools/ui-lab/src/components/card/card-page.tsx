import { ApiTable } from '../../pieces/api-table.js';
import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { MarcoDemo } from './marco.js';
import marcoCode from './marco.tsx?raw';

const CARD_API = [
    {
        name: 'size',
        type: "'fill' | 'content'",
        def: "'fill'",
        note: 'Lo que toma de su columna: todo lo que queda, o solo lo que mide su contenido.',
    },
    {
        name: 'aria-label',
        type: 'string',
        note: 'El nombre de una zona propia, como la consola. El cuerpo de una pestaña no lo lleva.',
    },
    { name: 'aria-labelledby', type: 'string', note: 'El nombre, si ya lo escribe un título.' },
] as const;

/** La superficie donde se trabaja: el marco lleva el cromo, la tarjeta el contenido. */
export function CardPage() {
    return (
        <DocPage
            lead="La ventana es un marco y el trabajo se apoya en tarjetas sobre él: blancas en
                claro, un escalón sobre el marco en oscuro, con un borde tenue y sin sombra. El
                hueco del marco separa dos tarjetas; una tarjeta nunca lleva otra dentro."
            title="Card"
        >
            <Demo
                code={marcoCode}
                ground="frame"
                heading="Tres tarjetas sobre el marco"
                intent="El destino mide lo suyo y la pareja de abajo se reparte el resto. Pasa a compacta desde Apariencia: el hueco y el radio se van y quedan líneas entre zonas."
            >
                <MarcoDemo />
            </Demo>

            <DocSection heading="API" intent="Una superficie, sin relleno propio.">
                <ApiTable caption="Props de Card" rows={CARD_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El cromo vive en el marco: barra de título, lateral, tira de pestañas y
                        barra de estado nunca van dentro de una tarjeta.
                    </li>
                    <li>Una tarjeta por zona y ninguna anidada: dentro, espacio y tono.</li>
                    <li>
                        La tarjeta no se aparta de sus vecinas con relleno propio: la separa el
                        hueco del marco, que en compacta vale cero.
                    </li>
                    <li>Sin sombra: la sombra es de lo que flota.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
